"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
  Video, MapPin, CheckCircle2, Loader2, Plus, X,
  Mail, Phone, User, AlertCircle, RefreshCw,
  MessageSquare, Check,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// All half-hour slots the doctor can offer — 8am to 8pm
const ALL_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = i % 2 === 0 ? "00" : "30"
  const label = `${h > 12 ? h - 12 : h}:${m} ${h >= 12 ? "PM" : "AM"}`
  return { value: `${String(h).padStart(2,"0")}:${m}`, label }
})

interface Appointment {
  id: string
  patientName: string
  patientEmail: string
  patientContact: string
  patientGender: string
  patientAge: number | null
  patientCity: string
  appointmentDate: string
  appointmentTime: string
  type: string
  status: string
  reason: string
  fee: number
  notes: string
  meetingLink: string
  createdAt: string
  attachedAnalysisId?: string | null
  attachedAnalysisDiagnosis?: string | null
}

interface SlotInfo {
  id: string
  date: string
  timeSlot: string
  isBooked: boolean
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    Scheduled:  "bg-blue-100 text-blue-700 border-blue-200",
    Confirmed:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    Completed:  "bg-slate-100 text-slate-600 border-slate-200",
    Cancelled:  "bg-red-100 text-red-700 border-red-200",
  }
  return (
    <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full border", cfg[status] || "bg-slate-100 text-slate-600 border-slate-200")}>
      {status}
    </span>
  )
}

function AppointmentCard({
  appt,
  onAction,
  actionLoading,
}: {
  appt: Appointment
  onAction: (id: string, action: string) => void
  actionLoading: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [notesText, setNotesText] = useState(appt.notes || "")

  const isPending = appt.status === "Scheduled"
  const isConfirmed = appt.status === "Confirmed"

  return (
    <Card className={cn(
      "border overflow-hidden transition-shadow hover:shadow-md",
      isPending && "border-l-4 border-l-amber-400 border-slate-200 dark:border-slate-800",
      isConfirmed && "border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800",
      !isPending && !isConfirmed && "border-slate-200 dark:border-slate-800"
    )}>
      <CardContent className="p-0">
        <button
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          onClick={() => setExpanded(e => !e)}
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {(appt.patientName || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white">{appt.patientName}</span>
              {appt.patientGender && <span className="text-xs text-slate-400">{appt.patientGender}</span>}
              {appt.patientAge && <span className="text-xs text-slate-400">{appt.patientAge} yrs</span>}
              {isPending && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold animate-pulse">Action Required</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{appt.appointmentDate}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{appt.appointmentTime}</span>
              <span className="flex items-center gap-1">
                {appt.type === "Video Call" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                {appt.type}
              </span>
              {appt.fee > 0 && <span className="font-semibold text-blue-600">₹{appt.fee}</span>}
            </div>
            {appt.reason && <p className="text-xs text-slate-400 mt-1 truncate">Reason: {appt.reason}</p>}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StatusBadge status={appt.status} />
          </div>
        </button>

        {expanded && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 sm:px-5 py-4 space-y-4">
            {/* Patient details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Full Name", value: appt.patientName },
                { label: "Email", value: appt.patientEmail },
                { label: "Contact", value: appt.patientContact || "N/A" },
                { label: "Gender", value: appt.patientGender || "N/A" },
                { label: "Age", value: appt.patientAge ? `${appt.patientAge} years` : "N/A" },
                { label: "City", value: appt.patientCity || "N/A" },
              ].map(f => (
                <div key={f.label} className="bg-white dark:bg-slate-800 rounded-xl px-3.5 py-3 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{f.value}</p>
                </div>
              ))}
            </div>

            {appt.reason && (
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider mb-1">Reason for Visit</p>
                <p className="text-sm text-blue-900 dark:text-blue-200">{appt.reason}</p>
              </div>
            )}

            {appt.attachedAnalysisDiagnosis && (
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider mb-1">Attached Skin Analysis</p>
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">{appt.attachedAnalysisDiagnosis}</p>
                <p className="text-[10px] mt-1 text-indigo-600">The patient attached their previous scan report. You can review the full ticket in your analyses tab.</p>
              </div>
            )}

            {/* Doctor action buttons */}
            {isPending && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={() => onAction(appt.id, "confirm")}
                  disabled={actionLoading === appt.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {actionLoading === appt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirm Appointment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onAction(appt.id, "reject")}
                  disabled={actionLoading === appt.id}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-2"
                >
                  <X className="h-4 w-4" /> Decline
                </Button>
              </div>
            )}

            {isConfirmed && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {appt.meetingLink && (
                  <a
                    href={appt.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Video className="h-4 w-4" /> Start Meeting
                  </a>
                )}
                <Button
                  variant="outline"
                  onClick={() => onAction(appt.id, "complete")}
                  disabled={actionLoading === appt.id}
                  className="flex-1 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark Completed
                </Button>
              </div>
            )}

            {/* Doctor notes (for confirmed/completed) */}
            {(isConfirmed || appt.status === "Completed") && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consultation Notes</p>
                <textarea
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  placeholder="Add consultation notes for this patient..."
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs gap-1.5"
                  onClick={async () => {
                    try {
                      await fetch(`/api/appointments/${appt.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "complete", notes: notesText }),
                      })
                      toast.success("Notes saved")
                    } catch {
                      toast.error("Failed to save notes")
                    }
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Save Notes
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DoctorAppointmentsPage() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()))
  const [monthSlots, setMonthSlots] = useState<Record<string, SlotInfo[]>>({})
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingAppts, setLoadingAppts] = useState(true)
  const [savingSlots, setSavingSlots] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editingSlots, setEditingSlots] = useState(false)
  const [draftSlots, setDraftSlots] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchMonthSlots = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/doctor/availability?year=${viewYear}&month=${viewMonth + 1}`)
      if (!res.ok) return
      const data: SlotInfo[] = await res.json()
      const grouped: Record<string, SlotInfo[]> = {}
      const todayDate = new Date()
      const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,"0")}-${String(todayDate.getDate()).padStart(2,"0")}`
      const currentHour = todayDate.getHours()
      const currentMin = todayDate.getMinutes()

      for (const s of data) {
        const d = (s as any).date
        
        // Filter out past slots if today
        if (d === todayStr) {
          const match = s.timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i)
          let h = 0, m = 0
          if (match) {
            h = parseInt(match[1], 10)
            m = parseInt(match[2], 10)
            const ampm = match[3].toUpperCase()
            if (ampm === 'PM' && h < 12) h += 12
            if (ampm === 'AM' && h === 12) h = 0
          } else {
            const parts = s.timeSlot.split(':')
            if (parts.length >= 2) {
              h = parseInt(parts[0], 10)
              m = parseInt(parts[1], 10)
            }
          }
          if (h < currentHour || (h === currentHour && m <= currentMin)) {
             // Skip past slots for today
             continue
          }
        }

        if (!grouped[d]) grouped[d] = []
        grouped[d].push(s)
      }
      setMonthSlots(grouped)
    } catch {
      // silently fail — availability is optional
    } finally {
      setLoadingSlots(false)
    }
  }, [viewYear, viewMonth])

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/doctor/appointments")
      const data = await res.json()
      setAppointments(Array.isArray(data) ? data : [])
    } catch {
      setAppointments([])
    } finally {
      setLoadingAppts(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchMonthSlots() }, [fetchMonthSlots])
  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  const handleDateClick = (iso: string) => {
    setSelectedDate(iso)
    if (editingSlots) {
      const existing = (monthSlots[iso] || []).map(s => s.timeSlot)
      setDraftSlots(existing)
    }
  }

  const handleStartEdit = () => {
    setEditingSlots(true)
    const existing = (monthSlots[selectedDate] || []).map(s => s.timeSlot)
    setDraftSlots(existing)
  }

  const handleSaveSlots = async () => {
    setSavingSlots(true)
    try {
      const res = await fetch("/api/doctor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, slots: draftSlots }),
      })
      if (res.ok) {
        toast.success(`Availability saved for ${selectedDate}`)
        setEditingSlots(false)
        fetchMonthSlots()
      } else {
        toast.error("Failed to save slots")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSavingSlots(false)
    }
  }

  const handleAppointmentAction = async (id: string, action: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok) {
        const messages: Record<string, string> = {
          confirm: "Appointment confirmed — patient notified by email",
          reject: "Appointment declined — patient notified",
          complete: "Marked as completed",
        }
        toast.success(messages[action] || "Updated", { duration: 5000 })
        fetchAppointments()
      } else {
        toast.error(data.error || "Action failed")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
    }
  }

  // Calendar
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  const selectedDaySlots = monthSlots[selectedDate] || []
  const pendingCount = appointments.filter(a => a.status === "Scheduled").length

  const filteredAppts = appointments.filter(a =>
    statusFilter === "all" ? true : a.status === statusFilter
  )

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" /> Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your availability and incoming appointment requests</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl animate-pulse">
              <AlertCircle className="h-4 w-4" /> {pendingCount} pending
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => { setIsRefreshing(true); fetchAppointments() }} disabled={isRefreshing} className="gap-1.5 text-slate-500">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left — Calendar & Slot Management */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </CardTitle>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
                      else setViewMonth(m => m - 1)
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                  </button>
                  <button
                    onClick={() => {
                      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
                      else setViewMonth(m => m + 1)
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                ))}
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const iso = toISO(viewYear, viewMonth, day)
                  const isToday = iso === todayISO
                  const isSelected = iso === selectedDate
                  const hasSlots = (monthSlots[iso] || []).length > 0
                  const hasBooking = (monthSlots[iso] || []).some(s => s.isBooked)
                  const isPast = iso < todayISO

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(iso)}
                      disabled={isPast}
                      className={cn(
                        "relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-semibold transition-all",
                        isSelected ? "bg-blue-600 text-white" :
                        isToday ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300" :
                        isPast ? "text-slate-300 dark:text-slate-600 cursor-not-allowed" :
                        "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {day}
                      {hasSlots && !isSelected && (
                        <span className={cn("absolute bottom-0.5 w-1 h-1 rounded-full", hasBooking ? "bg-red-400" : "bg-emerald-400")} />
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Slot management for selected date */}
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Slots — {selectedDate}
                </CardTitle>
                {!editingSlots && (
                  <Button size="sm" variant="outline" onClick={handleStartEdit} className="h-7 text-xs gap-1 px-2">
                    <Plus className="h-3 w-3" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {editingSlots ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SLOTS.map(s => {
                      const isSelected = draftSlots.includes(s.value)
                      
                      // Check if past slot for today
                      const isToday = selectedDate === todayISO
                      let isPast = false
                      if (isToday) {
                        const [hStr, mStr] = s.value.split(':')
                        const h = parseInt(hStr, 10)
                        const m = parseInt(mStr, 10)
                        const now = new Date()
                        if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
                          isPast = true
                        }
                      }

                      if (isPast) return null; // Don't show past slots for editing

                      return (
                        <button
                          key={s.value}
                          onClick={() => setDraftSlots(prev => isSelected ? prev.filter(t => t !== s.value) : [...prev, s.value])}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                            isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 hover:border-blue-300"
                          )}
                        >
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveSlots} disabled={savingSlots} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                      {savingSlots ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {savingSlots ? "Saving..." : `Save ${draftSlots.length} slots`}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingSlots(false); setDraftSlots([]) }} className="text-xs h-8">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : selectedDaySlots.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No slots set for this date. Click Edit to add availability.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDaySlots.map(s => (
                    <span
                      key={s.id}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                        s.isBooked ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}
                    >
                      {s.timeSlot} {s.isBooked && "· Booked"}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — Appointments list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "All" },
              { key: "Scheduled", label: "⏳ Pending" },
              { key: "Confirmed", label: "✅ Confirmed" },
              { key: "Completed", label: "🏁 Completed" },
              { key: "Cancelled", label: "✗ Cancelled" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all",
                  statusFilter === key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 hover:border-slate-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loadingAppts ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : filteredAppts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Calendar className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">No appointments found</p>
              <p className="text-xs text-slate-400 mt-1">
                {statusFilter === "all" ? "Patients will appear here once they book with you." : `No ${statusFilter.toLowerCase()} appointments.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppts.map(appt => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onAction={handleAppointmentAction}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
