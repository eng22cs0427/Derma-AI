"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Loader2, User, MapPin, HeartPulse, AlertTriangle,
  Mail, Phone, Calendar, Weight, Ruler, Edit2, Save, XCircle,
  CheckCircle2, WifiOff, Upload, Trash2, ShieldCheck, AlertCircle
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { useRef } from "react"
import { Country, State, City } from "country-state-city"

interface MedicalInfo {
  weight?: string
  height?: string
  skinType?: string
  skinConcern?: string
  currentMedications?: string
  knownAllergies?: string
  familyHistory?: string
  lifestyle?: string
}

interface UserProfile {
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
  isOnboarded?: boolean
  medicalInfo?: MedicalInfo | null
  createdAt: string
  updatedAt: string
  _dbOffline?: boolean
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</span>
    </div>
  )
}

const MANDATORY: { key: keyof UserProfile | keyof MedicalInfo; label: string; isMedical?: boolean }[] = [
  { key: "fullName", label: "Full Name" },
  { key: "contactNumber", label: "Mobile Number" },
  { key: "gender", label: "Gender" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "weight", label: "Weight (kg)", isMedical: true },
  { key: "height", label: "Height (cm)", isMedical: true },
  { key: "skinType", label: "Skin Type", isMedical: true },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile> & { firstName?: string; lastName?: string; medicalInfo?: MedicalInfo }>({})
  const [dbOffline, setDbOffline] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data: UserProfile = await response.json()
        setProfile(data)
        
        const nameParts = (data.fullName || "").split(" ")
        setFormData({ 
           ...data, 
           medicalInfo: data.medicalInfo || {},
           firstName: nameParts[0] || "",
           lastName: nameParts.slice(1).join(" ") || ""
        })
        
        setDbOffline(data._dbOffline === true)
      } else if (response.status === 404) {
        toast.error("Profile not found", { description: "Please try logging in again." })
      } else {
        throw new Error('Failed to load profile')
      }
    } catch {
      toast.error("Failed to load profile", { description: "Please refresh the page." })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const payloadToSave = { ...formData }
      if (payloadToSave.firstName || payloadToSave.lastName) {
        payloadToSave.fullName = `${payloadToSave.firstName || ""} ${payloadToSave.lastName || ""}`.trim()
      }
      delete payloadToSave.firstName
      delete payloadToSave.lastName

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSave),
      })

      if (response.ok) {
        const updated = await response.json()
        setProfile({ ...updated, _dbOffline: updated._dbOffline ?? false })
        setEditing(false)
        toast.success("Profile updated", { description: "Your changes have been saved." })
      } else if (response.status === 503) {
        const errData = await response.json()
        toast.warning("Database Offline", {
          description: errData.error || "Could not save — database is unreachable. Try again shortly.",
        })
        setEditing(false)
      } else {
        throw new Error('Failed to update profile')
      }
    } catch {
      toast.error("Save failed", { description: "Please try again." })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    const nameParts = (profile?.fullName || "").split(" ")
    setFormData({ 
       ...(profile || {}), 
       medicalInfo: profile?.medicalInfo || {},
       firstName: nameParts[0] || "",
       lastName: nameParts.slice(1).join(" ") || ""
    })
    setEditing(false)
  }

  const getInitials = (name: string) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return undefined
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    } catch { return dateStr }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setFormData(prev => ({ ...prev, avatarUrl: url }))
    setProfile(prev => prev ? ({ ...prev, avatarUrl: url }) : null)
    toast.success("Profile image updated! Please save changes if editing.")
    e.target.value = ""
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading your profile…</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Unable to load your profile data. Please try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchProfile} className="w-full">Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const medInfo = profile.medicalInfo

  const completion = Math.round((MANDATORY.filter(f => {
    if (f.isMedical) {
      return formData.medicalInfo?.[f.key as keyof MedicalInfo]
    }
    return formData[f.key as keyof UserProfile]
  }).length / MANDATORY.length) * 100) || 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Profile completion banner */}
      {completion < 100 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-800 dark:text-amber-300">Complete your profile to unlock all features</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                We need your personal and medical information to provide the most accurate AI skin analysis.
              </p>
            </div>
            {!editing && (
              <Button onClick={() => setEditing(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                Complete Now
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
              <span>Profile completion</span><span className="font-bold">{completion}%</span>
            </div>
            <Progress value={completion} className="h-2 [&>div]:bg-amber-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MANDATORY.map(f => {
              const v = f.isMedical ? formData.medicalInfo?.[f.key as keyof MedicalInfo] : formData[f.key as keyof UserProfile]
              const done = v !== undefined && v !== null && v !== ""
              return (
                <div key={f.key} className={`flex items-center gap-1.5 text-[10px] sm:text-xs px-2 py-1 rounded-lg border ${done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-amber-200 text-amber-700"}`}>
                  {done ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <AlertCircle className="h-3 w-3 shrink-0" />}
                  {f.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* DB Offline Banner */}
      {dbOffline && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">AWS Database Unreachable</p>
            <p className="text-xs mt-0.5">Showing profile from your Clerk account. Data saved in AWS RDS is temporarily unavailable due to an ETIMEDOUT network error. See the guide at the bottom of this page to fix it.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">View and manage your personal and medical information</p>
        </div>
        <div className="flex gap-2">
          {!dbOffline && !editing && (
            <Button onClick={() => setEditing(true)} className="gap-2">
              <Edit2 className="h-4 w-4" /> Edit Profile
            </Button>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving} className="gap-2">
                <XCircle className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Avatar + Name Card */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
        <div className="h-28 bg-gradient-to-r from-blue-600 to-violet-600 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] mix-blend-overlay"></div>
          
          <div className="absolute top-3 right-4 text-right">
            <h2 className="text-white/80 font-bold tracking-wider text-[10px] sm:text-xs uppercase">Derma Patient</h2>
            <p className="text-white/60 text-[8px] sm:text-[10px] font-medium tracking-wide uppercase">Powered by Derma AI</p>
          </div>

          <div className="z-10 text-center px-4">
            <h2 className="text-white font-black tracking-tight text-xl sm:text-2xl md:text-3xl drop-shadow-md">
              Your Skin Health, Monitored by AI
            </h2>
            <p className="text-blue-100/90 text-xs sm:text-sm md:text-base font-medium mt-1.5 drop-shadow">
              Manage your personal and medical information securely.
            </p>
          </div>
        </div>
        <CardContent className="relative pt-0 px-8 pb-6">
          <div className="flex items-center gap-4 -mt-12 mb-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-slate-950 bg-white shadow-sm">
                <AvatarImage src={profile.avatarUrl || undefined} alt={profile.fullName} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-blue-600 text-white">
                  {getInitials(profile.fullName)}
                </AvatarFallback>
              </Avatar>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700 text-blue-600 hover:text-blue-700 transition-colors"
                    title="Change Profile Picture"
                  >
                    <Upload className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => avatarFileRef.current?.click()} className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" /> Upload New Image
                  </DropdownMenuItem>
                  {profile.avatarUrl && (
                    <DropdownMenuItem onClick={() => {
                        setFormData(prev => ({ ...prev, avatarUrl: undefined }))
                        setProfile(prev => prev ? ({ ...prev, avatarUrl: undefined }) : null)
                        toast.success("Profile image removed! Please save changes.")
                      }} 
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Remove Image
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <input ref={avatarFileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1 min-w-0 mt-14">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold truncate">{profile.fullName || "—"}</h2>
                <Badge variant={profile.role === "doctor" ? "default" : "secondary"} className="capitalize">
                  {profile.role || "patient"}
                </Badge>
                {profile.isOnboarded && !dbOffline && (
                  <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                    <CheckCircle2 className="h-3 w-3" /> Onboarded
                  </Badge>
                )}
                {dbOffline && (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                    <WifiOff className="h-3 w-3" /> DB Offline
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">{profile.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Member since {formatDate(profile.createdAt) || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={formData.firstName || ""} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={formData.lastName || ""} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profile.email} disabled className="opacity-50" />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.dateOfBirth || ""} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={formData.gender || ""} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contact Number</Label>
                <Input type="tel" value={formData.contactNumber || ""} onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Full Name" value={profile.fullName} icon={User} />
              <InfoRow label="Email" value={profile.email} icon={Mail} />
              <InfoRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} icon={Calendar} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="Contact Number" value={profile.contactNumber} icon={Phone} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Street Address</Label>
                <Input value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" />
              </div>
              <div className="space-y-1.5">
                <Label>Country <span className="text-red-500">*</span></Label>
                <Select value={formData.country || ""} onValueChange={(v) => setFormData({ ...formData, country: v, state: "", city: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                  <SelectContent>
                    {Country.getAllCountries().map(c => <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>State <span className="text-red-500">*</span></Label>
                <Select disabled={!formData.country} value={formData.state || ""} onValueChange={(v) => setFormData({ ...formData, state: v, city: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const c = Country.getAllCountries().find(c => c.name === formData.country)
                      return c ? State.getStatesOfCountry(c.isoCode).map(s => <SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>) : null
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City <span className="text-red-500">*</span></Label>
                <Select disabled={!formData.state} value={formData.city || ""} onValueChange={(v) => setFormData({ ...formData, city: v })}>
                  <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const c = Country.getAllCountries().find(c => c.name === formData.country)
                      const s = c ? State.getStatesOfCountry(c.isoCode).find(s => s.name === formData.state) : null
                      return (c && s) ? City.getCitiesOfState(c.isoCode, s.isoCode).map(city => <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>) : null
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Postal Code</Label>
                <Input value={formData.postalCode || ""} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Address" value={profile.address} icon={MapPin} />
              <InfoRow label="City" value={profile.city} />
              <InfoRow label="State" value={profile.state} />
              <InfoRow label="Country" value={profile.country} />
              <InfoRow label="Postal Code" value={profile.postalCode} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardHeader>
          <CardTitle>About Me</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              rows={3}
              value={formData.bio || ""}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Write a brief bio about yourself..."
            />
          ) : (
            <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio || <span className="text-muted-foreground italic">No bio added yet</span>}</p>
          )}
        </CardContent>
      </Card>

      {/* Medical Information (from onboarding) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-rose-500" /> Medical Information
          </CardTitle>
          <CardDescription>
            Collected during onboarding and stored in AWS RDS — used to personalize AI analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dbOffline ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Medical data stored in AWS RDS is unavailable while the database is offline.
            </div>
          ) : editing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Weight (kg) <span className="text-red-500">*</span></Label>
                <Input type="number" value={formData.medicalInfo?.weight || ""} onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, weight: e.target.value } })} />
              </div>
              <div className="space-y-1.5">
                <Label>Height (cm) <span className="text-red-500">*</span></Label>
                <Input type="number" value={formData.medicalInfo?.height || ""} onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, height: e.target.value } })} />
              </div>
              <div className="space-y-1.5">
                <Label>Skin Type <span className="text-red-500">*</span></Label>
                <Select value={formData.medicalInfo?.skinType || ""} onValueChange={(v) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, skinType: v } })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dry">Dry</SelectItem>
                    <SelectItem value="Oily">Oily</SelectItem>
                    <SelectItem value="Combination">Combination</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Sensitive">Sensitive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Skin Concern</Label>
                <Input value={formData.medicalInfo?.skinConcern || ""} onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, skinConcern: e.target.value } })} />
              </div>
              <div className="space-y-1.5">
                <Label>Current Medications</Label>
                <Input value={formData.medicalInfo?.currentMedications || ""} onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, currentMedications: e.target.value } })} />
              </div>
              <div className="space-y-1.5">
                <Label>Known Allergies</Label>
                <Input value={formData.medicalInfo?.knownAllergies || ""} onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, knownAllergies: e.target.value } })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Family History</Label>
                <Input value={formData.medicalInfo?.familyHistory || ""} onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, familyHistory: e.target.value } })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Lifestyle</Label>
                <Input value={formData.medicalInfo?.lifestyle || ""} onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, lifestyle: e.target.value } })} />
              </div>
            </div>
          ) : medInfo ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Weight" value={medInfo.weight ? `${medInfo.weight} kg` : undefined} icon={Weight} />
              <InfoRow label="Height" value={medInfo.height ? `${medInfo.height} cm` : undefined} icon={Ruler} />
              <InfoRow label="Skin Type" value={medInfo.skinType} />
              <InfoRow label="Skin Concern" value={medInfo.skinConcern} />
              <InfoRow label="Current Medications" value={medInfo.currentMedications} />
              <InfoRow label="Known Allergies" value={medInfo.knownAllergies} />
              <InfoRow label="Family History" value={medInfo.familyHistory} />
              <InfoRow label="Lifestyle" value={medInfo.lifestyle} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
              <HeartPulse className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No medical information found. Click Edit Profile to update.
            </div>
          )}
        </CardContent>
      </Card>

      {/* AWS Fix Guide (only shown when DB is offline) */}
      {dbOffline && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" /> AWS RDS Unreachable — What to Fix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">Your AWS RDS instance at <code className="bg-muted px-1 py-0.5 rounded">3.7.51.118:5432</code> is refusing connections from your current IP. This is a <strong>Security Group (firewall) issue</strong> in AWS.</p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-primary">1.</span>
                <span>Go to <strong>AWS Console → RDS → Databases → dermasense-db → Connectivity &amp; Security → VPC security groups</strong></span>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-primary">2.</span>
                <span>Click the linked security group → <strong>Inbound rules → Edit inbound rules</strong></span>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-primary">3.</span>
                <span>Add a rule: <code className="bg-muted px-1 py-0.5 rounded">Type: PostgreSQL | Port: 5432 | Source: My IP</code> (or <code className="bg-muted px-1 py-0.5 rounded">0.0.0.0/0</code> for development)</span>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-primary">4.</span>
                <span>Ensure the RDS instance is <strong>not in a private subnet</strong> — it must be publicly accessible. In RDS settings, find <strong>Publicly accessible</strong> and set it to <strong>Yes</strong>.</span>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-primary">5.</span>
                <span>After saving, wait ~30 seconds and <Button variant="link" className="h-auto p-0 text-sm" onClick={fetchProfile}>click here to retry</Button>.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
