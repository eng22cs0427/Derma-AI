-- ============================================================================
-- DermaSense AI - AWS RDS PostgreSQL Database Schema
-- ============================================================================
-- Version: 1.0
-- Date: March 2026
-- Description: Complete database schema for migration from Supabase to AWS RDS
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- Stores user profile information
-- Linked 1:1 with Cognito User Pool

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) UNIQUE, -- Cognito sub (user ID)
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(50) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    contact_number VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for profiles
CREATE INDEX idx_profiles_cognito_user_id ON profiles(cognito_user_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Comments
COMMENT ON TABLE profiles IS 'User profile information synced with Cognito';
COMMENT ON COLUMN profiles.cognito_user_id IS 'Cognito User Pool user ID (sub claim)';

-- ============================================================================
-- TABLE: user_settings
-- ============================================================================
-- Stores user application preferences and settings

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de', 'hi', 'te')),
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    sms_notifications BOOLEAN DEFAULT false,
    measurement_unit VARCHAR(20) DEFAULT 'metric' CHECK (measurement_unit IN ('metric', 'imperial')),
    timezone VARCHAR(100) DEFAULT 'UTC',
    two_factor_enabled BOOLEAN DEFAULT false,
    marketing_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments
COMMENT ON TABLE user_settings IS 'User application preferences and notification settings';

-- ============================================================================
-- TABLE: medical_history
-- ============================================================================
-- Stores complete medical history for users

CREATE TABLE IF NOT EXISTS medical_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Appointment', 'Medicine', 'Analysis', 'Treatment', 'Lab Test', 'Prescription')),
    title VARCHAR(255) NOT NULL,
    data TEXT NOT NULL, -- Main data/description
    details JSONB, -- Additional structured data
    severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled', 'Pending')),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for medical_history
CREATE INDEX idx_medical_history_user_id ON medical_history(user_id);
CREATE INDEX idx_medical_history_type ON medical_history(type);
CREATE INDEX idx_medical_history_created_at ON medical_history(created_at DESC);
CREATE INDEX idx_medical_history_date ON medical_history(date DESC);
CREATE INDEX idx_medical_history_status ON medical_history(status);
CREATE INDEX idx_medical_history_details ON medical_history USING gin(details);

-- Comments
COMMENT ON TABLE medical_history IS 'Complete medical history including appointments, medicines, and analyses';
COMMENT ON COLUMN medical_history.details IS 'JSONB field for flexible structured data';

-- ============================================================================
-- TABLE: skin_analyses
-- ============================================================================
-- Stores skin cancer detection analyses

CREATE TABLE IF NOT EXISTS skin_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL, -- S3 URL
    image_key VARCHAR(500) NOT NULL, -- S3 object key
    prediction_class VARCHAR(50) NOT NULL, -- akiec, bcc, bkl, df, mel, nv, vasc
    confidence_score DECIMAL(5, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Very High')),
    all_predictions JSONB, -- All class probabilities
    heatmap_url TEXT, -- S3 URL for heatmap image
    notes TEXT,
    doctor_reviewed BOOLEAN DEFAULT false,
    doctor_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for skin_analyses
CREATE INDEX idx_skin_analyses_user_id ON skin_analyses(user_id);
CREATE INDEX idx_skin_analyses_prediction_class ON skin_analyses(prediction_class);
CREATE INDEX idx_skin_analyses_risk_level ON skin_analyses(risk_level);
CREATE INDEX idx_skin_analyses_created_at ON skin_analyses(created_at DESC);
CREATE INDEX idx_skin_analyses_follow_up_required ON skin_analyses(follow_up_required);
CREATE INDEX idx_skin_analyses_doctor_reviewed ON skin_analyses(doctor_reviewed);

-- Comments
COMMENT ON TABLE skin_analyses IS 'ML-based skin cancer detection results';

-- ============================================================================
-- TABLE: appointments
-- ============================================================================
-- Stores doctor appointment bookings

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id VARCHAR(100) NOT NULL, -- From doctors-data.ts or future doctors table
    doctor_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    appointment_type VARCHAR(50) DEFAULT 'Video Call' CHECK (appointment_type IN ('Video Call', 'In-Person', 'Phone Call')),
    status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Confirmed', 'Cancelled', 'Completed', 'No Show')),
    reason TEXT,
    notes TEXT,
    meeting_link TEXT,
    prescription_url TEXT, -- S3 URL
    bill_amount DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
    payment_id VARCHAR(255),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for appointments
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_appointment_date ON appointments(appointment_date DESC);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX idx_appointments_created_at ON appointments(created_at DESC);

-- Comments
COMMENT ON TABLE appointments IS 'Doctor appointment bookings and management';

-- ============================================================================
-- TABLE: medications
-- ============================================================================
-- Stores medication prescriptions and reminders

CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL, -- e.g., "Twice daily", "Every 8 hours"
    route VARCHAR(50) DEFAULT 'Oral' CHECK (route IN ('Oral', 'Topical', 'Injection', 'Inhalation', 'Other')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    prescribed_by VARCHAR(255), -- Doctor name
    prescription_url TEXT, -- S3 URL
    instructions TEXT,
    side_effects TEXT,
    notes TEXT,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_times TIME[], -- Array of times for reminders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for medications
CREATE INDEX idx_medications_user_id ON medications(user_id);
CREATE INDEX idx_medications_is_active ON medications(is_active);
CREATE INDEX idx_medications_start_date ON medications(start_date DESC);
CREATE INDEX idx_medications_reminder_enabled ON medications(reminder_enabled);

-- Comments
COMMENT ON TABLE medications IS 'Medication prescriptions and reminder settings';

-- ============================================================================
-- TABLE: orders
-- ============================================================================
-- Stores shop orders for medical products

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    items JSONB NOT NULL, -- Array of order items with product details
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) CHECK (payment_method IN ('COD', 'Credit Card', 'Debit Card', 'UPI', 'Stripe')),
    payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
    payment_id VARCHAR(255),
    order_status VARCHAR(50) DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    delivery_address JSONB NOT NULL, -- {line1, line2, city, state, postal_code, country}
    tracking_number VARCHAR(100),
    estimated_delivery DATE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Comments
COMMENT ON TABLE orders IS 'Shop orders for medical products and medicines';

-- ============================================================================
-- TABLE: audit_logs
-- ============================================================================
-- Stores audit trail for important actions

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., 'user.login', 'profile.update', 'analysis.create'
    resource_type VARCHAR(50), -- e.g., 'profile', 'appointment', 'order'
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for security and compliance';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_history_updated_at 
    BEFORE UPDATE ON medical_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at 
    BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for user dashboard summary
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
    p.id AS user_id,
    p.full_name,
    p.email,
    COUNT(DISTINCT sa.id) AS total_analyses,
    COUNT(DISTINCT CASE WHEN sa.created_at > CURRENT_DATE - INTERVAL '30 days' THEN sa.id END) AS recent_analyses,
    COUNT(DISTINCT a.id) AS total_appointments,
    COUNT(DISTINCT CASE WHEN a.appointment_date >= CURRENT_DATE THEN a.id END) AS upcoming_appointments,
    COUNT(DISTINCT m.id) AS active_medications,
    COUNT(DISTINCT o.id) AS total_orders
FROM profiles p
LEFT JOIN skin_analyses sa ON p.id = sa.user_id
LEFT JOIN appointments a ON p.id = a.user_id
LEFT JOIN medications m ON p.id = m.user_id AND m.is_active = true
LEFT JOIN orders o ON p.id = o.user_id
GROUP BY p.id, p.full_name, p.email;

COMMENT ON VIEW user_dashboard_summary IS 'Summary statistics for user dashboard';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_order_number VARCHAR(50);
    order_exists BOOLEAN;
BEGIN
    LOOP
        new_order_number := 'DS' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_order_number) INTO order_exists;
        
        EXIT WHEN NOT order_exists;
    END LOOP;
    
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_order_number IS 'Generates unique order number with format DS-YYYYMMDD-XXXX';

-- Function to clean up old audit logs (call via scheduled job)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Deletes audit logs older than specified days (default 90)';

-- ============================================================================
-- SAMPLE DATA (for testing - remove in production)
-- ============================================================================

-- Insert a test user profile
INSERT INTO profiles (id, email, full_name, gender) 
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'test@dermasense.ai', 'Test User', 'Male')
ON CONFLICT (id) DO NOTHING;

-- Insert test user settings
INSERT INTO user_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- GRANTS (adjust based on your access requirements)
-- ============================================================================

-- Grant permissions to application user (create this user separately)
-- CREATE USER dermasense_app WITH PASSWORD 'secure_password_here';
-- GRANT CONNECT ON DATABASE dermasense_db TO dermasense_app;
-- GRANT USAGE ON SCHEMA public TO dermasense_app;
-- Grants
-- Note: Replace with actual Postgres roles if different
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================================================
-- TABLE: orders
-- ============================================================================
-- Stores medical shop orders linked to User Profiles via Clerk ID

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Credit Card',
    payment_status VARCHAR(50) DEFAULT 'Paid',
    order_status VARCHAR(50) DEFAULT 'Confirmed',
    delivery_address JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

COMMENT ON TABLE orders IS 'Stores medical shop orders linked to users';

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Display table sizes
-- Note: VACUUM ANALYZE cannot run inside a transaction block.
-- PostgreSQL's autovacuum daemon handles this automatically.
-- To run manually, open a separate query window and execute: VACUUM ANALYZE;
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE 'Tables created: profiles, user_settings, medical_history, skin_analyses, appointments, medications, orders, audit_logs';
    RAISE NOTICE 'Views created: user_dashboard_summary';
    RAISE NOTICE 'Functions created: generate_order_number, cleanup_old_audit_logs';
END $$;
