-- ============================================================================
-- DermaSense AI — Migration: Add role to profiles + Create doctors table
-- ============================================================================
-- Run this in pgAdmin after running the initial schema.sql
-- Safe to run multiple times (uses IF NOT EXISTS / DO NOTHING)
-- ============================================================================

-- Step 1: Add role column to profiles (defaults to 'patient' for all existing users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'patient'
      CHECK (role IN ('patient', 'doctor', 'admin'));

    RAISE NOTICE '✅ Added role column to profiles';
  ELSE
    RAISE NOTICE 'ℹ️  role column already exists in profiles — skipping';
  END IF;
END $$;

-- Step 2: Create doctors table (professional profile linked to profiles)
CREATE TABLE IF NOT EXISTS doctors (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  specialty         VARCHAR(150) NOT NULL,
  qualifications    TEXT,                          -- e.g. "MBBS, MD Dermatology"
  experience_years  INTEGER DEFAULT 0,
  consultation_fee  DECIMAL(10, 2) DEFAULT 0,
  hospital_name     VARCHAR(255),
  hospital_address  TEXT,
  available_days    TEXT[],                        -- e.g. ARRAY['Monday','Tuesday','Friday']
  available_slots   JSONB,                         -- e.g. {"Monday": ["09:00","09:30"], ...}
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  bio               TEXT,
  rating            DECIMAL(3, 2) DEFAULT 0.00,
  total_patients    INTEGER DEFAULT 0,
  doctor_image_url  TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for doctors
CREATE INDEX IF NOT EXISTS idx_doctors_profile_id ON doctors(profile_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_is_verified ON doctors(is_verified);

COMMENT ON TABLE doctors IS 'Professional doctor profiles — linked 1:1 with profiles (role=doctor)';

-- Step 3: Add trigger to keep doctors.updated_at fresh
DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors;
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Add doctor_profile_id FK to appointments (so appointments can link to a real doctor profile)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'doctor_profile_id'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN doctor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_appointments_doctor_profile_id
      ON appointments(doctor_profile_id);

    RAISE NOTICE '✅ Added doctor_profile_id column to appointments';
  ELSE
    RAISE NOTICE 'ℹ️  doctor_profile_id already exists in appointments — skipping';
  END IF;
END $$;

-- ============================================================================
-- Admin seed: Create the first admin user manually
-- ============================================================================
-- After running this migration, create a user in Supabase (via app register),
-- then run this to promote them to admin (replace the email):
--
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
--
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE 'Tables updated: profiles (+ role column), doctors (new), appointments (+ doctor_profile_id)';
  RAISE NOTICE 'Next step: UPDATE profiles SET role = ''admin'' WHERE email = ''your-admin-email@example.com'';';
END $$;
