"use client"

/**
 * Doctor Dashboard — My Profile
 * /doctor-dashboard/profile
 *
 * Two-section page:
 *  1. Professional Profile  — specialty, hospital, fee, experience (stored in `doctors` table in AWS RDS)
 *  2. Personal Information  — name, contact, address, bio (stored in `profiles` table in AWS RDS)
 */

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Loader2, Edit2, Save, XCircle, Stethoscope, Building2,
  User, Mail, Phone, MapPin, Calendar, Star, Users,
  BadgeCheck, DollarSign, Clock, WifiOff, AlertTriangle,
  HeartPulse, Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DoctorProfile {
  // Personal (profiles table)
  userId: string
  email: string
  fullName: string
  avatarUrl?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  contactNumber?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  postalCode?: string | null
  bio?: string | null
  role: string
  isOnboarded: boolean
  createdAt: string
  updatedAt: string
  // Professional (doctors table)
  doctorRecordId?: string | null
  specialty?: string | null
  qualifications?: string | null
  experienceYears?: number | null
  consultationFee?: number | null
  hospitalName?: string | null
  hospitalAddress?: string | null
  availableDays?: string[]
  isVerified?: boolean
  professionalBio?: string | null
  rating?: number | null
  totalPatients?: number
  doctorImageUrl?: string | null
  _dbOffline?: boolean
}

// ─── Static data ───────────────────────────────────────────────────────────────
const SPECIALTIES = [
  "Dermatologist", "General Dermatology", "Cosmetic Dermatology",
  "Pediatric Dermatology", "Dermatopathology", "Surgical Dermatology",
  "Teledermatology", "Mohs Surgery", "Hair & Scalp Specialist", "Other",
]

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// ─── Helper: display row ───────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value?: string | number | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-sm font-medium">
        {value != null && value !== "" ? value : <span className="italic text-muted-foreground">Not set</span>}
      </p>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DoctorProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingProfessional, setEditingProfessional] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<DoctorProfile>>({})
  const [dbOffline, setDbOffline] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/doctor/profile")
      if (res.ok) {
        const data: DoctorProfile = await res.json()
        setProfile(data)
        setForm(data)
        setDbOffline(data._dbOffline === true)
      } else if (res.status === 404) {
        toast.error("Profile not found", { description: "Please contact an admin." })
      } else {
        throw new Error("Failed to load")
      }
    } catch {
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/doctor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile(updated)
        setForm(updated)
        setEditingPersonal(false)
        setEditingProfessional(false)
        toast.success("Profile updated", { description: "Saved to AWS RDS successfully." })
      } else if (res.status === 503) {
        const d = await res.json()
        toast.warning("Database Offline", { description: d.error })
        setEditingPersonal(false)
        setEditingProfessional(false)
      } else {
        const d = await res.json()
        toast.error("Save failed", { description: d.error || "Please try again." })
      }
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setSaving(false)
    }
  }

  const handleCancelPersonal = () => { setForm(profile || {}); setEditingPersonal(false) }
  const handleCancelProfessional = () => { setForm(profile || {}); setEditingProfessional(false) }

  const toggleDay = (day: string) => {
    const days = form.availableDays ?? []
    setForm({ ...form, availableDays: days.includes(day) ? days.filter(d => d !== day) : [...days, day] })
  }

  const formatDate = (d?: string | null) => {
    if (!d) return undefined
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) }
    catch { return d }
  }

  const initials = (profile?.fullName || profile?.email || "DR")
    .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  if (loading) return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading doctor profile…</p>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-sm w-full">
        <CardHeader>
          <CardTitle>Profile Not Found</CardTitle>
          <CardDescription>Unable to load your doctor profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchProfile} className="w-full">Retry</Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">

      {/* DB Offline Banner */}
      {dbOffline && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300">
          <WifiOff className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">AWS Database Unreachable</p>
            <p className="text-xs mt-0.5">Showing basic Clerk profile only. Professional details stored in AWS RDS are temporarily unavailable.</p>
          </div>
        </div>
      )}

      {/* ── Doctor Identity Card ─────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 relative">
          <div className="absolute inset-0 opacity-10 [background-image:url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%221%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M0%2040L40%200H20L0%2020M40%2040V20L20%2040%22/%3E%3C/g%3E%3C/svg%3E')]" />
        </div>
        <CardContent className="relative pt-0 px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-5">
            <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-slate-900 shadow-xl">
              <AvatarImage src={profile.doctorImageUrl || profile.avatarUrl || ""} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">
                  {profile.fullName ? `Dr. ${profile.fullName}` : "Doctor Profile"}
                </h1>
                {profile.isVerified && (
                  <Badge className="gap-1 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </Badge>
                )}
                <Badge variant="outline" className="capitalize">
                  {profile.role}
                </Badge>
              </div>
              {profile.specialty && (
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-0.5 flex items-center gap-1">
                  <Stethoscope className="h-3.5 w-3.5" /> {profile.specialty}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-800 dark:text-white">{profile.experienceYears ?? "—"}</p>
              <p className="text-xs text-muted-foreground font-medium">Yrs Experience</p>
            </div>
            <div className="text-center border-x border-slate-200 dark:border-slate-700">
              <p className="text-2xl font-black text-slate-800 dark:text-white">{profile.totalPatients ?? 0}</p>
              <p className="text-xs text-muted-foreground font-medium">Patients</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-slate-800 dark:text-white">
                {profile.rating ? `${Number(profile.rating).toFixed(1)}★` : "—"}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Professional Details ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4.5 w-4.5 text-blue-600" /> Professional Details
            </CardTitle>
            <CardDescription>Specialty, hospital, fees — stored in AWS RDS doctors table</CardDescription>
          </div>
          {!dbOffline && !editingProfessional && (
            <Button size="sm" variant="outline" onClick={() => setEditingProfessional(true)} className="gap-2 flex-shrink-0">
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingProfessional ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Specialty */}
                <div className="space-y-1.5">
                  <Label>Specialty *</Label>
                  <Select value={form.specialty ?? ""} onValueChange={v => setForm({ ...form, specialty: v })}>
                    <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Qualifications */}
                <div className="space-y-1.5">
                  <Label>Qualifications</Label>
                  <Input placeholder="e.g. MBBS, MD Dermatology" value={form.qualifications ?? ""}
                    onChange={e => setForm({ ...form, qualifications: e.target.value })} />
                </div>
                {/* Experience */}
                <div className="space-y-1.5">
                  <Label>Years of Experience</Label>
                  <Input type="number" min={0} max={60} placeholder="e.g. 8"
                    value={form.experienceYears ?? ""}
                    onChange={e => setForm({ ...form, experienceYears: Number(e.target.value) })} />
                </div>
                {/* Fee */}
                <div className="space-y-1.5">
                  <Label>Consultation Fee (₹)</Label>
                  <Input type="number" min={0} placeholder="e.g. 500"
                    value={form.consultationFee ?? ""}
                    onChange={e => setForm({ ...form, consultationFee: Number(e.target.value) })} />
                </div>
                {/* Hospital */}
                <div className="space-y-1.5">
                  <Label>Hospital / Clinic Name</Label>
                  <Input placeholder="e.g. Apollo Hospital"
                    value={form.hospitalName ?? ""}
                    onChange={e => setForm({ ...form, hospitalName: e.target.value })} />
                </div>
                {/* Hospital address */}
                <div className="space-y-1.5">
                  <Label>Hospital Address</Label>
                  <Input placeholder="Full address"
                    value={form.hospitalAddress ?? ""}
                    onChange={e => setForm({ ...form, hospitalAddress: e.target.value })} />
                </div>
              </div>

              {/* Available Days */}
              <div className="space-y-2">
                <Label>Available Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const active = (form.availableDays ?? []).includes(day)
                    return (
                      <button key={day} type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400"
                        }`}>
                        {day.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Professional Bio */}
              <div className="space-y-1.5">
                <Label>Professional Bio</Label>
                <Textarea rows={3} placeholder="Brief professional summary patients will see…"
                  value={form.professionalBio ?? ""}
                  onChange={e => setForm({ ...form, professionalBio: e.target.value })} />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={handleCancelProfessional} disabled={saving} className="gap-2">
                  <XCircle className="h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <InfoRow icon={Stethoscope} label="Specialty" value={profile.specialty} />
              <InfoRow icon={HeartPulse} label="Qualifications" value={profile.qualifications} />
              <InfoRow icon={Clock} label="Experience" value={profile.experienceYears != null ? `${profile.experienceYears} years` : null} />
              <InfoRow icon={DollarSign} label="Consultation Fee" value={profile.consultationFee != null ? `₹${profile.consultationFee}` : null} />
              <InfoRow icon={Building2} label="Hospital / Clinic" value={profile.hospitalName} />
              <InfoRow icon={MapPin} label="Hospital Address" value={profile.hospitalAddress} />
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Available Days
                </p>
                {profile.availableDays && profile.availableDays.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {profile.availableDays.map(d => (
                      <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Not set</p>
                )}
              </div>
              {profile.professionalBio && (
                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Professional Bio
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">{profile.professionalBio}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Personal Information ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4.5 w-4.5 text-indigo-600" /> Personal Information
            </CardTitle>
            <CardDescription>Name, contact, address — stored in AWS RDS profiles table</CardDescription>
          </div>
          {!dbOffline && !editingPersonal && (
            <Button size="sm" variant="outline" onClick={() => setEditingPersonal(true)} className="gap-2 flex-shrink-0">
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingPersonal ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={form.fullName ?? ""} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="opacity-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth ?? ""} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.gender ?? ""} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <Input type="tel" value={form.contactNumber ?? ""} onChange={e => setForm({ ...form, contactNumber: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={form.state ?? ""} onChange={e => setForm({ ...form, state: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={form.country ?? ""} onChange={e => setForm({ ...form, country: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Personal Bio</Label>
                <Textarea rows={2} placeholder="Brief personal note…" value={form.bio ?? ""}
                  onChange={e => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={handleCancelPersonal} disabled={saving} className="gap-2">
                  <XCircle className="h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <InfoRow icon={User} label="Full Name" value={profile.fullName} />
              <InfoRow icon={Mail} label="Email" value={profile.email} />
              <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow icon={Phone} label="Contact Number" value={profile.contactNumber} />
              <InfoRow icon={MapPin} label="City" value={profile.city} />
              <InfoRow label="State" value={profile.state} />
              <InfoRow label="Country" value={profile.country} />
              <InfoRow label="Address" value={profile.address} />
              {profile.bio && (
                <div className="md:col-span-2 lg:col-span-3 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Personal Bio</p>
                  <p className="text-sm leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Account Meta ────────────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
            <span>Member since <strong>{formatDate(profile.createdAt)}</strong></span>
            <span>Last updated <strong>{formatDate(profile.updatedAt)}</strong></span>
            <span>Role <strong className="capitalize">{profile.role}</strong></span>
            {profile.isVerified && (
              <span className="text-blue-600 font-semibold flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified Doctor
              </span>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
