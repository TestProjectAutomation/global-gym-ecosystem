-- database/schema.sql

-- Multi-tenant schema
CREATE SCHEMA IF NOT EXISTS gym_ecosystem;

-- Languages table (Dynamic language storage)
CREATE TABLE gym_ecosystem.languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, -- 'en', 'ar', 'fa', etc.
    name VARCHAR(50) NOT NULL,
    native_name VARCHAR(50),
    direction VARCHAR(3) DEFAULT 'ltr', -- 'ltr' or 'rtl'
    is_active BOOLEAN DEFAULT true,
    is_fallback BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Translation keys
CREATE TABLE gym_ecosystem.translation_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(255) UNIQUE NOT NULL, -- 'dashboard.title', 'membership.expiry'
    module VARCHAR(100), -- 'general', 'membership', 'reports'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Translation values (Dynamic language content)
CREATE TABLE gym_ecosystem.translations (
    id SERIAL PRIMARY KEY,
    key_id INTEGER REFERENCES gym_ecosystem.translation_keys(id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES gym_ecosystem.languages(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key_id, language_id)
);

-- Tenants (Gym branches)
CREATE TABLE gym_ecosystem.tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    default_language_id INTEGER REFERENCES gym_ecosystem.languages(id),
    supported_languages INTEGER[] DEFAULT ARRAY[1], -- Array of language IDs
    primary_calendar VARCHAR(20) DEFAULT 'gregorian', -- 'gregorian', 'hijri', 'persian'
    secondary_calendar VARCHAR(20),
    timezone VARCHAR(100) DEFAULT 'UTC',
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE gym_ecosystem.users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES gym_ecosystem.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    preferred_language_id INTEGER REFERENCES gym_ecosystem.languages(id),
    preferred_calendar VARCHAR(20) DEFAULT 'gregorian',
    role VARCHAR(50) DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    preferences JSONB, -- Store user-specific settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Members
CREATE TABLE gym_ecosystem.members (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES gym_ecosystem.tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES gym_ecosystem.users(id),
    membership_number VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    birth_date_hijri VARCHAR(20), -- Store Hijri equivalent
    phone VARCHAR(50),
    address TEXT,
    emergency_contact JSONB,
    qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Memberships
CREATE TABLE gym_ecosystem.memberships (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES gym_ecosystem.members(id) ON DELETE CASCADE,
    membership_type VARCHAR(50),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    start_date_hijri VARCHAR(20),
    end_date_hijri VARCHAR(20),
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance logs
CREATE TABLE gym_ecosystem.attendance (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES gym_ecosystem.members(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES gym_ecosystem.tenants(id),
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE,
    check_in_hijri VARCHAR(20),
    check_out_hijri VARCHAR(20),
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calendar systems
CREATE TABLE gym_ecosystem.calendar_systems (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL, -- 'gregorian', 'hijri', 'persian'
    name VARCHAR(100) NOT NULL,
    conversion_function VARCHAR(100), -- Stored procedure name for conversion
    month_names JSONB, -- Month names in different languages
    weekday_names JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hijri specific adjustments
CREATE TABLE gym_ecosystem.hijri_adjustments (
    id SERIAL PRIMARY KEY,
    year INTEGER,
    month INTEGER,
    day_adjustment INTEGER DEFAULT 0, -- Adjust for moon sighting
    region VARCHAR(100), -- Regional variations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_translations_language ON gym_ecosystem.translations(language_id);
CREATE INDEX idx_users_preferred_language ON gym_ecosystem.users(preferred_language_id);
CREATE INDEX idx_memberships_dates ON gym_ecosystem.memberships(start_date, end_date);
CREATE INDEX idx_attendance_check_in ON gym_ecosystem.attendance(check_in);