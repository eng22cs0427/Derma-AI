/**
 * Profile Sync — Clerk Auth ↔ MongoDB Atlas
 * Replaces PostgreSQL queries with MongoDB operations.
 * All exported function signatures are unchanged.
 */
import { getCollection, ObjectId } from './mongodb'
import type { IProfile } from '@/database/mongodb-schema'

export interface UserProfile {
  userId: string
  email: string
  fullName: string
  dateOfBirth?: string
  gender?: string
  contactNumber?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  bio?: string
  avatarUrl?: string
  role?: string
  isActive?: boolean
  isOnboarded?: boolean
  medicalInfo?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

function docToProfile(doc: IProfile): UserProfile {
  return {
    userId: doc.clerkUserId,
    email: doc.email,
    fullName: doc.fullName || '',
    dateOfBirth: doc.dateOfBirth,
    gender: doc.gender,
    contactNumber: doc.contactNumber,
    address: doc.address,
    city: doc.city,
    state: doc.state,
    country: doc.country,
    postalCode: doc.postalCode,
    bio: doc.bio,
    avatarUrl: doc.avatarUrl,
    role: doc.role || 'patient',
    isActive: doc.isActive,
    isOnboarded: doc.isOnboarded ?? false,
    medicalInfo: doc.medicalInfo,
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
  }
}

export async function getUserProfile(clerkUserId: string): Promise<UserProfile | null> {
  const col = await getCollection<IProfile>('profiles')
  const doc = await col.findOne({ clerkUserId, isActive: true })
  if (!doc) return null
  return docToProfile(doc)
}

export async function updateUserProfile(
  clerkUserId: string,
  updates: Partial<Omit<UserProfile, 'userId' | 'email' | 'createdAt'>>
): Promise<void> {
  const col = await getCollection<IProfile>('profiles')

  const $set: Partial<IProfile> = { updatedAt: new Date() }

  if (updates.fullName !== undefined) $set.fullName = updates.fullName
  if (updates.dateOfBirth !== undefined) $set.dateOfBirth = updates.dateOfBirth || undefined
  if (updates.gender !== undefined) $set.gender = updates.gender ? (updates.gender.charAt(0).toUpperCase() + updates.gender.slice(1).toLowerCase()) : undefined
  if (updates.contactNumber !== undefined) $set.contactNumber = updates.contactNumber
  if (updates.address !== undefined) $set.address = updates.address
  if (updates.city !== undefined) $set.city = updates.city
  if (updates.state !== undefined) $set.state = updates.state
  if (updates.country !== undefined) $set.country = updates.country
  if (updates.postalCode !== undefined) $set.postalCode = updates.postalCode
  if (updates.bio !== undefined) $set.bio = updates.bio
  if (updates.avatarUrl !== undefined) $set.avatarUrl = updates.avatarUrl
  if (updates.isOnboarded !== undefined) $set.isOnboarded = updates.isOnboarded as boolean
  if (updates.medicalInfo !== undefined) $set.medicalInfo = updates.medicalInfo as Record<string, unknown>

  await col.updateOne({ clerkUserId }, { $set })
}

/**
 * Idempotent upsert — safe to call on every page load.
 * Creates profile if it doesn't exist; never clobbers is_onboarded.
 */
export async function ensureUserProfileExists(
  clerkUserId: string,
  email: string,
  fullName: string
): Promise<UserProfile> {
  const col = await getCollection<IProfile>('profiles')

  await col.updateOne(
    { clerkUserId },
    {
      $setOnInsert: {
        clerkUserId,
        fullName,
        role: 'patient' as const,
        isActive: true,
        isOnboarded: false,
        createdAt: new Date(),
      },
      $set: {
        email,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  const doc = await col.findOne({ clerkUserId, isActive: true })
  if (!doc) throw new Error(`Profile upsert failed for ${clerkUserId}`)
  return docToProfile(doc)
}
