// web-dashboard/src/i18n/LanguageContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface Language {
    code: string;
    name: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
}

interface Translation {
    [key: string]: string;
}

interface LanguageContextType {
    currentLanguage: string;
    languages: Language[];
    translations: Translation;
    direction: 'ltr' | 'rtl';
    setLanguage: (code: string) => Promise<void>;
    t: (key: string, params?: Record<string, string>) => string;
    loadTranslations: (languageCode: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState<string>('en');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [translations, setTranslations] = useState<Translation>({});
    const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');

    useEffect(() => {
        loadLanguages();
        
        // Load saved language preference
        const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';
        setLanguage(savedLanguage);
    }, []);

    const loadLanguages = async () => {
        try {
            const response = await axios.get('/api/languages');
            setLanguages(response.data);
        } catch (error) {
            console.error('Failed to load languages', error);
        }
    };

    const loadTranslations = async (languageCode: string) => {
        try {
            const response = await axios.get(`/api/translations/${languageCode}`);
            setTranslations(response.data);
            
            // Update HTML direction
            const lang = languages.find(l => l.code === languageCode);
            if (lang) {
                setDirection(lang.direction);
                document.documentElement.dir = lang.direction;
                document.documentElement.lang = languageCode;
            }
        } catch (error) {
            console.error('Failed to load translations', error);
        }
    };

    const setLanguage = async (code: string) => {
        setCurrentLanguage(code);
        localStorage.setItem('preferredLanguage', code);
        await loadTranslations(code);
    };

    const t = (key: string, params?: Record<string, string>): string => {
        let text = translations[key] || key;
        
        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                text = text.replace(`{{${paramKey}}}`, paramValue);
            });
        }
        
        return text;
    };

    return (
        <LanguageContext.Provider value={{
            currentLanguage,
            languages,
            translations,
            direction,
            setLanguage,
            t,
            loadTranslations
        }}>
            {children}
        </LanguageContext.Provider>
    );
};