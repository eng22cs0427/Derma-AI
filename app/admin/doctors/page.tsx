"use client"

/**
 * Admin — Doctor Management
 * /admin/doctors
 *
 * This page lets an admin:
 *  - View all current doctors
 *  - Add a new doctor by email (only allowed if NOT already a patient)
 *  - Remove a doctor (demote back to patient)
 *
 * Rules enforced:
 *  - Admins can convert a registered patient to a doctor
 *  - Doctors bypass the patient dashboard and log directly into the doctor dashboard
 */

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  UserCheck, UserX, Plus, RefreshCcw, Loader2,
  Mail, Shield, AlertTriangle, CheckCircle, Stethoscope,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Doctor {
  cognito_user_id: string
  email: string
  full_name: string
  role: string
  contact_number: string | null
  is_onboarded: boolean
  created_at: string
}

function DoctorRow({ doctor, onDemote }: { doctor: Doctor; onDemote: (email: string) => void }) {
  const [demoting, setDemoting] = useState(false)

  const handleDemote = async () => {
    if (!confirm(`Remove doctor role from ${doctor.email}? They will become a patient.`)) return
    setDemoting(true)
    await onDemote(doctor.email)
    setDemoting(false)
  }

  const initials = (doctor.full_name || doctor.email)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm text-slate-800 dark:text-white truncate">
            {doctor.full_name || "—"}
          </span>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 text-xs font-medium">
            <Stethoscope className="h-3 w-3 mr-1" /> Doctor
          </Badge>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Mail className="h-3 w-3 text-slate-400" />
          <span className="text-xs text-slate-500 truncate">{doctor.email}</span>
        </div>
        {doctor.contact_number && (
          <span className="text-xs text-slate-400 mt-0.5 block">📞 {doctor.contact_number}</span>
        )}
      </div>

      {/* Date */}
      <div className="hidden sm:block text-xs text-slate-400 text-right flex-shrink-0">
        Added {new Date(doctor.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </div>

      {/* Remove button */}
      <Button
        variant="outline"
        size="sm"
        className="flex-shrink-0 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
        onClick={handleDemote}
        disabled={demoting}
      >
        {demoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
        Remove
      </Button>
    </div>
  )
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  const fetchDoctors = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/doctors")
      const data = await res.json()
      if (res.ok) {
        setDoctors(data.doctors || [])
      } else {
        setError(data.error || "Failed to load doctors")
      }
    } catch {
      setError("Network error — could not reach the server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [])

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address")
      return
    }

    setAdding(true)
    try {
      const res = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Doctor added!", { description: data.message })
        setNewEmail("")
        fetchDoctors()
      } else if (res.status === 409) {
        // Patient-guard triggered
        toast.error("Cannot Promote", { description: data.error, duration: 8000 })
      } else {
        toast.error("Failed to add doctor", { description: data.error || "Unknown error" })
      }
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setAdding(false)
    }
  }

  const handleDemote = async (email: string) => {
    try {
      const res = await fetch("/api/admin/doctors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Doctor removed", { description: data.message })
        fetchDoctors()
      } else {
        toast.error("Failed to remove doctor", { description: data.error })
      }
    } catch {
      toast.error("Network error — please try again")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" /> Doctor Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Add or remove doctor accounts. You can convert any registered patient into a doctor.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDoctors} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Rule notice */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-amber-800 dark:text-amber-300 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="mt-0.5 text-blue-700 dark:text-blue-400 text-xs leading-relaxed">
              You can convert any registered <strong>patient</strong> into a <strong>Doctor</strong>. Once promoted, that user will no longer be able to access the Patient Dashboard, and will strictly log into the Doctor Dashboard.
            </p>
          </div>
        </div>

        {/* Add Doctor Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4.5 w-4.5 text-green-600" /> Add New Doctor
            </CardTitle>
            <CardDescription>
              Enter the email address of the user to promote. They must have already registered and logged in at least once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDoctor} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="doctor-email" className="sr-only">Email Address</Label>
                <Input
                  id="doctor-email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={adding}
                  className="h-10"
                />
              </div>
              <Button type="submit" disabled={adding || !newEmail.trim()} className="gap-2 h-10 px-5">
                {adding
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</>
                  : <><Plus className="h-4 w-4" /> Add Doctor</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Doctor List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Stethoscope className="h-4.5 w-4.5 text-blue-600" /> Active Doctors
              </span>
              <Badge variant="secondary">{doctors.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading doctors…</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-red-600 text-sm py-6 justify-center">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Stethoscope className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm">No doctors found. Add one above.</p>
              </div>
            ) : (
              doctors.map((doctor) => (
                <DoctorRow key={doctor.email} doctor={doctor} onDemote={handleDemote} />
              ))
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Doctor must first <strong>register</strong> at <code className="bg-muted px-1 rounded">/register</code> with their doctor email</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Then enter their email here and click <strong>Add Doctor</strong></span>
            </div>
            <div className="flex gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>They will see the <strong>Doctor Dashboard</strong> at <code className="bg-muted px-1 rounded">/doctor-dashboard</code> on next login</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Once promoted, they will lose access to the patient dashboard and exclusively use the doctor interface.</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
