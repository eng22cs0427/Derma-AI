-- ============================================================
-- Migration: Ensure doctors table has UNIQUE on profile_id
-- Run this once in pgAdmin / psql if not already applied
-- Safe to run multiple times
-- ============================================================

-- Add UNIQUE constraint on doctors.profile_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'doctors_profile_id_key' AND conrelid = 'doctors'::regclass
  ) THEN
    ALTER TABLE doctors ADD CONSTRAINT doctors_profile_id_key UNIQUE (profile_id);
    RAISE NOTICE '✅ Added UNIQUE constraint on doctors.profile_id';
  ELSE
    RAISE NOTICE 'ℹ️  Constraint already exists — skipping';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE '⚠️  doctors table does not exist yet — run migration_roles_doctors.sql first';
END $$;

-- Verify
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'doctors'::regclass
ORDER BY conname;
