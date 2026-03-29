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
  CheckCircle2, WifiOff,
} from "lucide-react"

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [dbOffline, setDbOffline] = useState(false)

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
        setFormData(data)
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
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
    setFormData(profile || {})
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 ring-4 ring-primary/20">
              <AvatarImage src={profile.avatarUrl || ""} alt={profile.fullName} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                {getInitials(profile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
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
                <Label>Full Name</Label>
                <Input value={formData.fullName || ""} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
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
                <Label>City</Label>
                <Input value={formData.city || ""} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={formData.state || ""} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={formData.country || ""} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
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
              No medical information found. This is filled during onboarding.
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
