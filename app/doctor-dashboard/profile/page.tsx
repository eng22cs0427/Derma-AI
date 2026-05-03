"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Loader2, Save, Stethoscope, Building2, User, Phone,
  MapPin, Clock, BadgeCheck, DollarSign, Calendar, Link2,
  FileText, Upload, Eye, ShieldCheck, AlertCircle, CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

const SPECIALTIES = [
  "Dermatologist","General Dermatology","Cosmetic Dermatology",
  "Pediatric Dermatology","Dermatopathology","Surgical Dermatology",
  "Teledermatology","Mohs Surgery","Hair & Scalp Specialist","Other",
]
const DAYS_OF_WEEK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
const LANGUAGES = ["English","Hindi","Tamil","Telugu","Kannada","Malayalam","Bengali","Marathi","Gujarati","Other"]

interface DoctorProfile {
  userId: string; email: string; fullName: string
  avatarUrl?: string | null; doctorImageUrl?: string | null
  contactNumber?: string | null; gender?: string | null
  city?: string | null; state?: string | null; country?: string | null
  address?: string | null; bio?: string | null
  specialty?: string | null; qualifications?: string | null
  experienceYears?: number | null; consultationFee?: number | null
  hospitalName?: string | null; hospitalAddress?: string | null
  availableDays?: string[]; professionalBio?: string | null
  meetingLink?: string | null; licenseNumber?: string | null
  licenseDocumentUrl?: string | null; languages?: string[]
  isVerified?: boolean; rating?: number | null; totalPatients?: number
  profileComplete?: boolean; role: string; createdAt: string; updatedAt: string
  _dbOffline?: boolean
}

// Fields the doctor must fill before accessing the dashboard
const MANDATORY: { key: keyof DoctorProfile; label: string }[] = [
  { key: "contactNumber", label: "Mobile Number" },
  { key: "specialty", label: "Specialty" },
  { key: "qualifications", label: "Qualifications" },
  { key: "experienceYears", label: "Years of Experience" },
  { key: "hospitalName", label: "Hospital / Clinic Name" },
  { key: "hospitalAddress", label: "Hospital Address" },
  { key: "meetingLink", label: "Video Meeting Link" },
  { key: "licenseNumber", label: "Medical License Number" },
]

function calcCompletion(p: Partial<DoctorProfile>) {
  const filled = MANDATORY.filter(f => {
    const v = p[f.key]
    return v !== undefined && v !== null && v !== ""
  }).length
  return Math.round((filled / MANDATORY.length) * 100)
}

function isValidUrl(s: string) {
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:" }
  catch { return false }
}

export default function DoctorProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [form, setForm] = useState<Partial<DoctorProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    setLoading(true)
    try {
      const res = await fetch("/api/doctor/profile")
      if (res.ok) {
        const data: DoctorProfile = await res.json()
        setProfile(data); setForm(data)
      }
    } catch { toast.error("Failed to load profile") }
    finally { setLoading(false) }
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.contactNumber?.trim()) e.contactNumber = "Mobile number is required"
    else if (form.contactNumber.replace(/\D/g,"").length < 10) e.contactNumber = "Enter a valid 10-digit mobile number"
    if (!form.specialty) e.specialty = "Select your specialty"
    if (!form.qualifications?.trim()) e.qualifications = "Qualifications are required (e.g. MBBS, MD)"
    if (!form.experienceYears || form.experienceYears < 0) e.experienceYears = "Enter years of experience"
    if (!form.hospitalName?.trim()) e.hospitalName = "Hospital / Clinic name is required"
    if (!form.hospitalAddress?.trim()) e.hospitalAddress = "Hospital address is required"
    if (!form.meetingLink?.trim()) e.meetingLink = "Meeting link is required for video consultations"
    else if (!isValidUrl(form.meetingLink)) e.meetingLink = "Enter a valid URL (https://...)"
    if (!form.licenseNumber?.trim()) e.licenseNumber = "Medical license number is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) {
      toast.error("Please fill all mandatory fields")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/doctor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile(prev => prev ? { ...prev, ...updated } : updated)
        setForm(prev => ({ ...prev, ...updated }))
        toast.success("Profile saved successfully")
        if (updated.profileComplete) {
          toast.success("Profile complete! You can now access all features.", { duration: 5000 })
        }
      } else {
        const d = await res.json()
        toast.error(d.error || "Save failed")
      }
    } catch { toast.error("Network error — please try again") }
    finally { setSaving(false) }
  }

  function toggleDay(day: string) {
    const days = form.availableDays ?? []
    setForm({ ...form, availableDays: days.includes(day) ? days.filter(d => d !== day) : [...days, day] })
  }

  function toggleLanguage(lang: string) {
    const langs = form.languages ?? []
    setForm({ ...form, languages: langs.includes(lang) ? langs.filter(l => l !== lang) : [...langs, lang] })
  }

  // Simple document URL input (real upload would use S3/Cloudinary)
  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return }
    setUploading(true)
    // In production: upload to cloud storage and get back URL
    // For now, store file name as placeholder
    setTimeout(() => {
      setForm(prev => ({ ...prev, licenseDocumentUrl: `uploaded:${file.name}` }))
      toast.success(`Document "${file.name}" uploaded`)
      setUploading(false)
    }, 800)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Could not load your profile. <button onClick={fetchProfile} className="text-blue-600 underline">Retry</button></p>
    </div>
  )

  const completion = calcCompletion(form)
  const initials = (profile.fullName || profile.email || "DR").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  const Field = ({ name, label, required, children, hint }: {
    name: string; label: string; required?: boolean; children: React.ReactNode; hint?: string
  }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {errors[name] && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors[name]}</p>}
      {!errors[name] && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Profile completion banner — only shown when incomplete */}
      {!profile.profileComplete && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-800 dark:text-amber-300">Complete your profile to access the dashboard</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                Patients need your details to book appointments. Fill all mandatory fields marked with <span className="text-red-500 font-bold">*</span>
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
              <span>Profile completion</span><span className="font-bold">{completion}%</span>
            </div>
            <Progress value={completion} className="h-2 [&>div]:bg-amber-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MANDATORY.map(f => {
              const v = form[f.key]
              const done = v !== undefined && v !== null && v !== ""
              return (
                <div key={f.key} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-amber-200 text-amber-700"}`}>
                  {done ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <AlertCircle className="h-3 w-3 shrink-0" />}
                  {f.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Identity card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700" />
        <CardContent className="relative pt-0 px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-slate-900 shadow-xl">
              <AvatarImage src={profile.doctorImageUrl || profile.avatarUrl || ""} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-indigo-700 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{profile.fullName ? `Dr. ${profile.fullName}` : "Doctor"}</h1>
                {profile.isVerified && <Badge className="gap-1 bg-blue-100 text-blue-700 border-blue-200"><BadgeCheck className="h-3 w-3" />Verified</Badge>}
                {profile.profileComplete && <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3" />Profile Complete</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
            <div><p className="text-2xl font-black">{profile.experienceYears ?? "—"}</p><p className="text-xs text-muted-foreground">Yrs Exp</p></div>
            <div className="border-x border-slate-200 dark:border-slate-700"><p className="text-2xl font-black">{profile.totalPatients ?? 0}</p><p className="text-xs text-muted-foreground">Patients</p></div>
            <div><p className="text-2xl font-black">{profile.rating ? `${Number(profile.rating).toFixed(1)}★` : "—"}</p><p className="text-xs text-muted-foreground">Rating</p></div>
          </div>
        </CardContent>
      </Card>

      {/* ── Professional Details ── */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Stethoscope className="h-4 w-4 text-blue-600" />Professional Details</CardTitle><CardDescription>Mandatory — patients see these when booking</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="specialty" label="Specialty" required>
              <Select value={form.specialty ?? ""} onValueChange={v => setForm({ ...form, specialty: v })}>
                <SelectTrigger className={errors.specialty ? "border-red-400" : ""}><SelectValue placeholder="Select specialty" /></SelectTrigger>
                <SelectContent>{SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field name="qualifications" label="Qualifications" required hint="e.g. MBBS, MD Dermatology">
              <Input placeholder="e.g. MBBS, MD Dermatology" value={form.qualifications ?? ""} onChange={e => setForm({ ...form, qualifications: e.target.value })} className={errors.qualifications ? "border-red-400" : ""} />
            </Field>
            <Field name="experienceYears" label="Years of Experience" required>
              <Input type="number" min={0} max={60} placeholder="e.g. 8" value={form.experienceYears ?? ""} onChange={e => setForm({ ...form, experienceYears: Number(e.target.value) })} className={errors.experienceYears ? "border-red-400" : ""} />
            </Field>
            <Field name="consultationFee" label="Consultation Fee (₹)">
              <Input type="number" min={0} placeholder="e.g. 800" value={form.consultationFee ?? ""} onChange={e => setForm({ ...form, consultationFee: Number(e.target.value) })} />
            </Field>
            <Field name="hospitalName" label="Hospital / Clinic Name" required>
              <Input placeholder="e.g. Apollo Hospital" value={form.hospitalName ?? ""} onChange={e => setForm({ ...form, hospitalName: e.target.value })} className={errors.hospitalName ? "border-red-400" : ""} />
            </Field>
            <Field name="hospitalAddress" label="Hospital Address" required>
              <Input placeholder="Full address with city" value={form.hospitalAddress ?? ""} onChange={e => setForm({ ...form, hospitalAddress: e.target.value })} className={errors.hospitalAddress ? "border-red-400" : ""} />
            </Field>
          </div>

          {/* Available Days */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Available Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => {
                const active = (form.availableDays ?? []).includes(day)
                return (
                  <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-600 hover:border-blue-400 dark:border-slate-600 dark:text-slate-400"}`}>
                    {day.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Languages Spoken</Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => {
                const active = (form.languages ?? []).includes(lang)
                return (
                  <button key={lang} type="button" onClick={() => toggleLanguage(lang)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-600 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-400"}`}>
                    {lang}
                  </button>
                )
              })}
            </div>
          </div>

          <Field name="professionalBio" label="Professional Bio" hint="This is visible to patients when they view your profile">
            <Textarea rows={3} placeholder="Brief professional summary — specialization, notable achievements, patient-care philosophy…" value={form.professionalBio ?? ""} onChange={e => setForm({ ...form, professionalBio: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      {/* ── Video Consultation & License ── */}
      <Card className="border-blue-100 dark:border-blue-900/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-blue-600" />Consultation Link & License</CardTitle><CardDescription>Mandatory — required before patients can book appointments</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <Field name="meetingLink" label="Video Meeting Link" required hint="Google Meet, Zoom, Teams, Jitsi — any valid https:// link">
            <div className="relative">
              <Link2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://meet.google.com/your-room-id"
                value={form.meetingLink ?? ""}
                onChange={e => setForm({ ...form, meetingLink: e.target.value })}
                className={`pl-9 ${errors.meetingLink ? "border-red-400" : ""}`}
              />
            </div>
            {form.meetingLink && isValidUrl(form.meetingLink) && (
              <a href={form.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                <Eye className="h-3 w-3" /> Test link
              </a>
            )}
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="licenseNumber" label="Medical License Number" required hint="As registered with Medical Council of India or state board">
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="e.g. MCI-12345-2015" value={form.licenseNumber ?? ""} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} className={`pl-9 ${errors.licenseNumber ? "border-red-400" : ""}`} />
              </div>
            </Field>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> License Document <span className="text-xs text-muted-foreground">(PDF/Image, max 5MB)</span></Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-600"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</div>
                ) : form.licenseDocumentUrl ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Document uploaded</div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Upload className="h-4 w-4" /> Upload document</div>
                )}
              </div>
              <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleDocUpload} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Personal / Contact ── */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-indigo-600" />Contact Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="contactNumber" label="Mobile Number" required hint="Patients may call you at this number">
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="tel" placeholder="+91 98765 43210" value={form.contactNumber ?? ""} onChange={e => setForm({ ...form, contactNumber: e.target.value })} className={`pl-9 ${errors.contactNumber ? "border-red-400" : ""}`} />
              </div>
            </Field>
            <Field name="gender" label="Gender">
              <Select value={form.gender ?? ""} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Male","Female","Other","Prefer not to say"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field name="city" label="City">
              <Input value={form.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Mumbai" />
            </Field>
            <Field name="state" label="State">
              <Input value={form.state ?? ""} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="e.g. Maharashtra" />
            </Field>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-medium">Clinic / Home Address</Label>
              <Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Your personal address (optional)" />
            </div>
          </div>
          <Field name="bio" label="Personal Note">
            <Textarea rows={2} placeholder="Any personal note for patients…" value={form.bio ?? ""} onChange={e => setForm({ ...form, bio: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="sticky bottom-4 z-10">
        <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-lg px-5 py-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="text-sm text-muted-foreground">
            {completion < 100
              ? <span className="text-amber-600 font-medium">⚠ Fill all mandatory fields to unlock dashboard access</span>
              : <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> All required fields filled</span>
            }
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Profile
          </Button>
        </div>
      </div>

    </div>
  )
}
