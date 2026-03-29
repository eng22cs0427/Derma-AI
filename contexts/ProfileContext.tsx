"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export interface ProfileData {
  fullName: string
  email: string
  contactNumber: string
  gender?: string
  dateOfBirth?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  avatarUrl?: string
  role?: string
  isOnboarded?: boolean
  medicalInfo?: {
    weight?: string
    height?: string
    skinType?: string
    skinConcern?: string
    currentMedications?: string
    knownAllergies?: string
    familyHistory?: string
    lifestyle?: string
  }
}

interface ProfileContextValue {
  profile: ProfileData | null
  isLoading: boolean
  dbOffline: boolean
  refetch: () => void
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  isLoading: true,
  dbOffline: false,
  refetch: () => {},
})

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dbOffline, setDbOffline] = useState(false)

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/profile")
      if (res.ok) {
        const data = await res.json()
        setDbOffline(data._dbOffline === true)
        setProfile({
          fullName: data.fullName || "",
          email: data.email || "",
          contactNumber: data.contactNumber || "",
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          avatarUrl: data.avatarUrl,
          role: data.role,
          isOnboarded: data.isOnboarded,
          medicalInfo: data.medicalInfo,
        })
      }
    } catch (err) {
      console.error("ProfileContext: failed to fetch profile", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, isLoading, dbOffline, refetch: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
