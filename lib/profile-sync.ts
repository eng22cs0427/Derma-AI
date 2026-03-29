/**
 * Profile Sync — Clerk Auth ↔ AWS RDS PostgreSQL
 *
 * Clerk handles login/signup.
 * This module bridges the Clerk user ID to a profile
 * row in the PostgreSQL `profiles` table on AWS RDS.
 */

import { query } from './aws-database';

export interface UserProfile {
  userId: string;        // = profiles.cognito_user_id (Clerk user id)
  email: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  contactNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  bio?: string;
  avatarUrl?: string;
  role?: string;         // 'patient' | 'doctor' | 'admin'
  isActive?: boolean;
  isOnboarded?: boolean;
  medicalInfo?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Maps a PostgreSQL row (snake_case) to the UserProfile interface (camelCase)
 */
function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    userId: row.cognito_user_id as string,
    email: row.email as string,
    fullName: (row.full_name as string) || '',
    dateOfBirth: row.date_of_birth as string | undefined,
    gender: row.gender as string | undefined,
    contactNumber: row.contact_number as string | undefined,
    address: row.address as string | undefined,
    city: row.city as string | undefined,
    state: row.state as string | undefined,
    country: row.country as string | undefined,
    postalCode: row.postal_code as string | undefined,
    bio: row.bio as string | undefined,
    avatarUrl: row.avatar_url as string | undefined,
    role: (row.role as string) || 'patient',
    isActive: row.is_active as boolean | undefined,
    isOnboarded: row.is_onboarded as boolean ?? false,
    medicalInfo: row.medical_info as Record<string, unknown> | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || new Date().toISOString(),
    updatedAt: (row.updated_at as Date)?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Fetch a user profile from PostgreSQL by Clerk user ID.
 * Returns null if the profile does not exist yet.
 */
export async function getUserProfile(clerkUserId: string): Promise<UserProfile | null> {
  const result = await query(
    `SELECT * FROM profiles WHERE cognito_user_id = $1 AND is_active = true LIMIT 1`,
    [clerkUserId]
  );

  if (result.rows.length === 0) return null;
  return rowToProfile(result.rows[0]);
}

/**
 * Update an existing profile in PostgreSQL.
 * Only provided fields are updated (undefined fields are skipped).
 */
export async function updateUserProfile(
  clerkUserId: string,
  updates: Partial<Omit<UserProfile, 'userId' | 'email' | 'createdAt'>>
): Promise<void> {
  const fieldMap: Record<string, string> = {
    fullName: 'full_name',
    dateOfBirth: 'date_of_birth',
    gender: 'gender',
    contactNumber: 'contact_number',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    postalCode: 'postal_code',
    bio: 'bio',
    avatarUrl: 'avatar_url',
    role: 'role',
    isOnboarded: 'is_onboarded',
    medicalInfo: 'medical_info',
  };

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && fieldMap[key]) {
      setClauses.push(`${fieldMap[key]} = $${idx}`);
      // PG Driver requires explicit JSON serialization for JSONB columns
      params.push(key === 'medicalInfo' ? JSON.stringify(value) : value);
      idx++;
    }
  }

  if (setClauses.length === 0) return;

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(clerkUserId);

  await query(
    `UPDATE profiles SET ${setClauses.join(', ')} WHERE cognito_user_id = $${idx}`,
    params
  );
}

/**
 * Idempotent helper: create profile row if it doesn't exist, then ALWAYS return
 * the latest persisted row including is_onboarded. This is safe to call on every
 * page load — it will never clobber existing onboarding status.
 */
export async function ensureUserProfileExists(
  clerkUserId: string,
  email: string,
  fullName: string
): Promise<UserProfile> {
  // Step 1: upsert the profile — only updates email/name, NEVER touches is_onboarded
  await query(
    `INSERT INTO profiles (cognito_user_id, email, full_name, role, is_onboarded)
     VALUES ($1, $2, $3, 'patient', false)
     ON CONFLICT (cognito_user_id) DO UPDATE
       SET email = EXCLUDED.email,
           updated_at = CURRENT_TIMESTAMP`,
    [clerkUserId, email, fullName]
  );

  // Step 2: Always re-fetch the fresh row so we get the TRUE persisted is_onboarded value
  const result = await query(
    `SELECT * FROM profiles WHERE cognito_user_id = $1 AND is_active = true LIMIT 1`,
    [clerkUserId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Profile not found after upsert for user: ${clerkUserId}`);
  }

  return rowToProfile(result.rows[0]);
}
