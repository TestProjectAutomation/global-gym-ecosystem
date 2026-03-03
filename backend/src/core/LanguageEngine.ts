// backend/src/core/LanguageEngine.ts

import { Pool } from 'pg';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

interface Translation {
    key: string;
    value: string;
    language: string;
}

export class LanguageEngine extends EventEmitter {
    private pool: Pool;
    private redis: Redis;
    private cache: Map<string, Map<string, string>> = new Map();
    private fallbackLanguage: string = 'en';
    
    constructor(pool: Pool, redis: Redis) {
        super();
        this.pool = pool;
        this.redis = redis;
        this.initialize();
    }
    
    private async initialize() {
        // Load all translations into cache
        await this.loadAllTranslations();
        
        // Set up refresh interval
        setInterval(() => this.refreshCache(), 3600000); // Refresh every hour
    }
    
    async loadAllTranslations(): Promise<void> {
        const query = `
            SELECT tk.key_name, t.value, l.code as language_code
            FROM gym_ecosystem.translations t
            JOIN gym_ecosystem.translation_keys tk ON t.key_id = tk.id
            JOIN gym_ecosystem.languages l ON t.language_id = l.id
            WHERE l.is_active = true
        `;
        
        const result = await this.pool.query(query);
        
        // Clear existing cache
        this.cache.clear();
        
        // Build cache structure: language_code -> { key: value }
        for (const row of result.rows) {
            if (!this.cache.has(row.language_code)) {
                this.cache.set(row.language_code, new Map());
            }
            this.cache.get(row.language_code)!.set(row.key_name, row.value);
        }
    }
    
    async refreshCache(): Promise<void> {
        await this.loadAllTranslations();
        this.emit('translations-updated');
    }
    
    async getTranslation(key: string, language: string, params?: Record<string, string>): Promise<string> {
        // Try to get from cache
        const langCache = this.cache.get(language);
        let translation = langCache?.get(key);
        
        // Fallback to fallback language
        if (!translation && language !== this.fallbackLanguage) {
            const fallbackCache = this.cache.get(this.fallbackLanguage);
            translation = fallbackCache?.get(key);
        }
        
        // If still not found, return the key
        if (!translation) {
            translation = key;
            // Log missing translation
            await this.logMissingTranslation(key, language);
        }
        
        // Replace parameters
        if (params) {
            translation = this.replaceParams(translation, params);
        }
        
        return translation;
    }
    
    async getMultipleTranslations(keys: string[], language: string): Promise<Record<string, string>> {
        const result: Record<string, string> = {};
        
        for (const key of keys) {
            result[key] = await this.getTranslation(key, language);
        }
        
        return result;
    }
    
    async addLanguage(languageData: {
        code: string;
        name: string;
        nativeName: string;
        direction: 'ltr' | 'rtl';
    }): Promise<number> {
        const query = `
            INSERT INTO gym_ecosystem.languages 
            (code, name, native_name, direction)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
        
        const result = await this.pool.query(query, [
            languageData.code,
            languageData.name,
            languageData.nativeName,
            languageData.direction
        ]);
        
        // Refresh cache
        await this.refreshCache();
        
        return result.rows[0].id;
    }
    
    async addTranslation(key: string, translations: Array<{ languageCode: string; value: string }>): Promise<void> {
        // Start transaction
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Insert or get key
            let keyId: number;
            const keyResult = await client.query(
                'INSERT INTO gym_ecosystem.translation_keys (key_name) VALUES ($1) ON CONFLICT (key_name) DO UPDATE SET key_name = EXCLUDED.key_name RETURNING id',
                [key]
            );
            keyId = keyResult.rows[0].id;
            
            // Insert translations
            for (const t of translations) {
                const langResult = await client.query(
                    'SELECT id FROM gym_ecosystem.languages WHERE code = $1',
                    [t.languageCode]
                );
                
                if (langResult.rows.length > 0) {
                    await client.query(
                        `INSERT INTO gym_ecosystem.translations (key_id, language_id, value)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (key_id, language_id) 
                         DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
                        [keyId, langResult.rows[0].id, t.value]
                    );
                }
            }
            
            await client.query('COMMIT');
            
            // Refresh cache
            await this.refreshCache();
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    async importTranslationsFromFile(languageCode: string, filePath: string): Promise<void> {
        // Implementation for importing from JSON/CSV
        const translations = require(filePath); // Simplified, use proper file parsing
        
        for (const [key, value] of Object.entries(translations)) {
            await this.addTranslation(key, [{ languageCode, value: value as string }]);
        }
    }
    
    async exportTranslationsToFile(languageCode: string): Promise<Record<string, string>> {
        const langCache = this.cache.get(languageCode);
        if (!langCache) return {};
        
        return Object.fromEntries(langCache.entries());
    }
    
    async getLanguageDirection(languageCode: string): Promise<'ltr' | 'rtl'> {
        const query = 'SELECT direction FROM gym_ecosystem.languages WHERE code = $1';
        const result = await this.pool.query(query, [languageCode]);
        
        if (result.rows.length > 0) {
            return result.rows[0].direction;
        }
        
        return 'ltr'; // Default
    }
    
    async getMissingTranslations(languageCode: string): Promise<string[]> {
        const query = `
            SELECT tk.key_name
            FROM gym_ecosystem.translation_keys tk
            WHERE NOT EXISTS (
                SELECT 1 FROM gym_ecosystem.translations t
                JOIN gym_ecosystem.languages l ON t.language_id = l.id
                WHERE t.key_id = tk.id AND l.code = $1
            )
        `;
        
        const result = await this.pool.query(query, [languageCode]);
        return result.rows.map(row => row.key_name);
    }
    
    async getLanguageCompleteness(languageCode: string): Promise<number> {
        const query = `
            WITH total_keys AS (
                SELECT COUNT(*) as count FROM gym_ecosystem.translation_keys
            ),
            translated_keys AS (
                SELECT COUNT(*) as count
                FROM gym_ecosystem.translations t
                JOIN gym_ecosystem.languages l ON t.language_id = l.id
                WHERE l.code = $1
            )
            SELECT 
                CASE 
                    WHEN total_keys.count > 0 
                    THEN (translated_keys.count::float / total_keys.count::float) * 100
                    ELSE 0
                END as completeness
            FROM total_keys, translated_keys
        `;
        
        const result = await this.pool.query(query, [languageCode]);
        return Math.round(result.rows[0]?.completeness || 0);
    }
    
    private async logMissingTranslation(key: string, language: string): Promise<void> {
        // Log to database for admin review
        const query = `
            INSERT INTO gym_ecosystem.missing_translations (key_name, language_code, requested_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (key_name, language_code) DO NOTHING
        `;
        
        await this.pool.query(query, [key, language]);
    }
    
    private replaceParams(text: string, params: Record<string, string>): string {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] || match;
        });
    }
    
    async setFallbackLanguage(languageCode: string): Promise<void> {
        this.fallbackLanguage = languageCode;
    }
}