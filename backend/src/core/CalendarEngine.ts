// backend/src/core/CalendarEngine.ts

import { Pool } from 'pg';
import * as moment from 'moment';
import * as momentHijri from 'moment-hijri';
import * as momentJalaali from 'moment-jalaali';

interface DateConversionResult {
    gregorian: Date;
    hijri?: string;
    persian?: string;
    formatted: string;
}

export class CalendarEngine {
    private pool: Pool;
    private supportedCalendars: Map<string, any> = new Map();
    
    constructor(pool: Pool) {
        this.pool = pool;
        this.initializeCalendars();
    }
    
    private initializeCalendars() {
        // Initialize calendar converters
        this.supportedCalendars.set('gregorian', {
            fromDate: (date: Date) => date,
            toDate: (dateStr: string) => new Date(dateStr),
            format: (date: Date, format: string) => moment(date).format(format)
        });
        
        this.supportedCalendars.set('hijri', {
            fromDate: (date: Date) => moment(date).format('iYYYY/iM/iD'),
            toDate: (hijriStr: string) => moment(hijriStr, 'iYYYY/iM/iD').toDate(),
            format: (date: Date, format: string) => {
                // Convert Hijri format tokens
                const hijriFormat = format
                    .replace(/YYYY/g, 'iYYYY')
                    .replace(/MM/g, 'iMM')
                    .replace(/DD/g, 'iDD');
                return moment(date).format(hijriFormat);
            }
        });
        
        this.supportedCalendars.set('persian', {
            fromDate: (date: Date) => moment(date).format('jYYYY/jM/jD'),
            toDate: (persianStr: string) => moment(persianStr, 'jYYYY/jM/jD').toDate(),
            format: (date: Date, format: string) => {
                const persianFormat = format
                    .replace(/YYYY/g, 'jYYYY')
                    .replace(/MM/g, 'jMM')
                    .replace(/DD/g, 'jDD');
                return moment(date).format(persianFormat);
            }
        });
    }
    
    async convertDate(
        date: Date | string,
        fromCalendar: string,
        toCalendar: string,
        userId?: number
    ): Promise<DateConversionResult> {
        let sourceDate: Date;
        
        if (typeof date === 'string') {
            // Convert from calendar string to Date
            const converter = this.supportedCalendars.get(fromCalendar);
            if (!converter) {
                throw new Error(`Unsupported calendar: ${fromCalendar}`);
            }
            sourceDate = converter.toDate(date);
        } else {
            sourceDate = date;
        }
        
        const result: DateConversionResult = {
            gregorian: sourceDate,
            formatted: ''
        };
        
        // Convert to Hijri if requested
        if (toCalendar === 'hijri' || toCalendar === 'both') {
            result.hijri = moment(sourceDate).format('iYYYY/iM/iD');
        }
        
        // Convert to Persian if requested
        if (toCalendar === 'persian' || toCalendar === 'both') {
            result.persian = moment(sourceDate).format('jYYYY/jM/jD');
        }
        
        // Get user preferences for formatting
        if (userId) {
            const userPrefs = await this.getUserCalendarPreferences(userId);
            result.formatted = this.formatDateForUser(sourceDate, userPrefs);
        } else {
            result.formatted = sourceDate.toISOString();
        }
        
        return result;
    }
    
    async getDateInUserCalendar(date: Date, userId: number): Promise<string> {
        const prefs = await this.getUserCalendarPreferences(userId);
        return this.formatDateForUser(date, prefs);
    }
    
    async formatDateForReports(
        startDate: Date,
        endDate: Date,
        calendarType: string,
        tenantId: number
    ): Promise<{ start: string; end: string; intervals: any[] }> {
        const converter = this.supportedCalendars.get(calendarType);
        if (!converter) {
            throw new Error(`Unsupported calendar: ${calendarType}`);
        }
        
        // Get tenant formatting preferences
        const tenantPrefs = await this.getTenantCalendarPreferences(tenantId);
        
        const result = {
            start: converter.format(startDate, tenantPrefs.dateFormat),
            end: converter.format(endDate, tenantPrefs.dateFormat),
            intervals: [] as any[]
        };
        
        // Generate intervals based on calendar type
        if (calendarType === 'hijri') {
            // Hijri months are lunar-based
            let currentDate = moment(startDate);
            while (currentDate.isBefore(endDate)) {
                const monthStart = currentDate.clone().startOf('iMonth');
                const monthEnd = currentDate.clone().endOf('iMonth');
                
                result.intervals.push({
                    label: currentDate.format('iMMMM iYYYY'),
                    start: monthStart.toDate(),
                    end: monthEnd.toDate(),
                    hijriMonth: currentDate.iMonth() + 1,
                    hijriYear: currentDate.iYear()
                });
                
                currentDate.add(1, 'iMonth');
            }
        } else {
            // Gregorian intervals
            let currentDate = moment(startDate);
            while (currentDate.isBefore(endDate)) {
                const monthStart = currentDate.clone().startOf('month');
                const monthEnd = currentDate.clone().endOf('month');
                
                result.intervals.push({
                    label: currentDate.format('MMMM YYYY'),
                    start: monthStart.toDate(),
                    end: monthEnd.toDate()
                });
                
                currentDate.add(1, 'month');
            }
        }
        
        return result;
    }
    
    async isRamadan(date: Date): Promise<boolean> {
        const hijriMonth = moment(date).iMonth() + 1; // iMonth is 0-based
        return hijriMonth === 9; // Ramadan is the 9th month
    }
    
    async getRamadanAlerts(tenantId: number, date: Date): Promise<any[]> {
        // Check for upcoming Ramadan and generate alerts
        const alerts = [];
        
        // Check next 30 days
        for (let i = 0; i < 30; i++) {
            const checkDate = moment(date).add(i, 'days').toDate();
            if (await this.isRamadan(checkDate)) {
                alerts.push({
                    date: checkDate,
                    hijriDate: moment(checkDate).format('iYYYY/iM/iD'),
                    message: 'Ramadan starts soon',
                    type: 'ramadan_start'
                });
                break;
            }
        }
        
        return alerts;
    }
    
    async addCalendarSystem(calendarData: {
        code: string;
        name: string;
        conversionFunction: string;
        monthNames: Record<string, string[]>;
        weekdayNames: Record<string, string[]>;
    }): Promise<void> {
        const query = `
            INSERT INTO gym_ecosystem.calendar_systems 
            (code, name, conversion_function, month_names, weekday_names)
            VALUES ($1, $2, $3, $4, $5)
        `;
        
        await this.pool.query(query, [
            calendarData.code,
            calendarData.name,
            calendarData.conversionFunction,
            JSON.stringify(calendarData.monthNames),
            JSON.stringify(calendarData.weekdayNames)
        ]);
        
        // Dynamically load conversion function
        this.loadConversionFunction(calendarData.code, calendarData.conversionFunction);
    }
    
    private async getUserCalendarPreferences(userId: number): Promise<any> {
        const query = `
            SELECT u.preferred_calendar, t.date_format
            FROM gym_ecosystem.users u
            JOIN gym_ecosystem.tenants t ON u.tenant_id = t.id
            WHERE u.id = $1
        `;
        
        const result = await this.pool.query(query, [userId]);
        
        if (result.rows.length > 0) {
            return {
                calendar: result.rows[0].preferred_calendar,
                format: result.rows[0].date_format
            };
        }
        
        return {
            calendar: 'gregorian',
            format: 'YYYY-MM-DD'
        };
    }
    
    private async getTenantCalendarPreferences(tenantId: number): Promise<any> {
        const query = `
            SELECT primary_calendar, date_format
            FROM gym_ecosystem.tenants
            WHERE id = $1
        `;
        
        const result = await this.pool.query(query, [tenantId]);
        
        if (result.rows.length > 0) {
            return {
                calendar: result.rows[0].primary_calendar,
                format: result.rows[0].date_format
            };
        }
        
        return {
            calendar: 'gregorian',
            format: 'YYYY-MM-DD'
        };
    }
    
    private formatDateForUser(date: Date, prefs: any): string {
        const converter = this.supportedCalendars.get(prefs.calendar);
        if (!converter) {
            return date.toISOString();
        }
        
        return converter.format(date, prefs.format);
    }
    
    private loadConversionFunction(code: string, functionName: string): void {
        // Dynamically load and register conversion function
        // This would require eval or dynamic import in production
        // For security, we'd use a plugin system
        console.log(`Loading conversion function ${functionName} for ${code}`);
    }
}