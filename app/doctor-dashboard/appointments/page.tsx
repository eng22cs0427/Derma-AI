"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
  Video, MapPin, CheckCircle2, Loader2, Plus, X,
  Mail, Phone, User, Stethoscope, AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// All times doctor can offer, 30-min slots 8am–8pm
const ALL_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = i % 2 === 0 ? "00" : "30"
  const label = `${h > 12 ? h - 12 : h}:${m} ${h >= 12 ? "PM" : "AM"}`
  return { value: `${String(h).padStart(2,"0")}:${m}`, label }
})

interface Appt {
  id: string
  patient_name: string
  patient_email?: string
  patient_contact?: string
  appointment_date: string
  appointment_time: string
  status: string
  type?: string
  fee?: number
  specialty?: string
  is_real?: boolean
}

interface SlotInfo {
  id?: string
  timeSlot: string
  isBooked: boolean
  appointmentId?: string | null
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]

export default function DoctorAppointmentsPage() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(toISO(today.getFullYear(), today.getMonth(), today.getDate()))
  const [monthSlots, setMonthSlots] = useState<Record<string, SlotInfo[]>>({})   // key = YYYY-MM-DD
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingAppts, setLoadingAppts] = useState(false)
  const [savingSlots, setSavingSlots] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [editingSlots, setEditingSlots] = useState(false)
  const [draftSlots, setDraftSlots] = useState<string[]>([])

  const fetchMonthSlots = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/doctor/availability?year=${viewYear}&month=${viewMonth + 1}`)
      if (!res.ok) return
      const data: SlotInfo[] = await res.json()
      const grouped: Record<string, SlotInfo[]> = {}
      for (const s of data) {
        const d = (s as unknown as { date: string }).date
        if (!grouped[d]) grouped[d] = []
        grouped[d].push(s)
      }
      setMonthSlots(grouped)
    } catch { console.warn("Could not load availability") }
    finally { setLoadingSlots(false) }
  }, [viewYear, viewMonth])

  const fetchAppointments = useCallback(async () => {
    setLoadingAppts(true)
    try {
      const res = await fetch("/api/doctor/appointments")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setAppointments(data)
      }
    } catch { console.warn("Could not load appointments") }
    finally { setLoadingAppts(false) }
  }, [])

  useEffect(() => { fetchMonthSlots() }, [fetchMonthSlots])
  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function startEditSlots() {
    const existing = (monthSlots[selectedDate] ?? []).filter(s => !s.isBooked).map(s => s.timeSlot)
    setDraftSlots(existing)
    setEditingSlots(true)
  }

  function toggleDraftSlot(slot: string) {
    setDraftSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot])
  }

  async function saveSlots() {
    setSavingSlots(true)
    try {
      const res = await fetch("/api/doctor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, slots: draftSlots }),
      })
      if (res.ok) {
        toast.success(`Saved ${draftSlots.length} slot(s) for ${selectedDate}`)
        setEditingSlots(false)
        await fetchMonthSlots()
      } else toast.error("Failed to save slots")
    } catch { toast.error("Network error") }
    finally { setSavingSlots(false) }
  }

  async function confirmAppointment(apptId: string) {
    setConfirmingId(apptId)
    try {
      const res = await fetch(`/api/doctor/appointments/${apptId}/confirm`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        toast.success("Appointment confirmed! Patient email sent.", { duration: 5000 })
        setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: "Confirmed" } : a))
        await fetchMonthSlots()
      } else {
        toast.error(data.error || "Confirmation failed")
      }
    } catch { toast.error("Network error") }
    finally { setConfirmingId(null) }
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  // Appointments for the selected date
  const dateAppts = appointments.filter(a => a.appointment_date === selectedDate)
  const selectedSlots = monthSlots[selectedDate] ?? []

  // Days that have slots set
  const daysWithSlots = new Set(Object.keys(monthSlots))
  const daysWithAppts = new Set(appointments.map(a => a.appointment_date))

  const statusColor: Record<string, string> = {
    Confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Scheduled: "bg-blue-100 text-blue-700 border-blue-200",
    Cancelled: "bg-red-100 text-red-700 border-red-200",
    Completed: "bg-slate-100 text-slate-600 border-slate-200",
    "No Show": "bg-orange-100 text-orange-700 border-orange-200",
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" /> Appointments & Availability
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your monthly availability and confirm patient bookings</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {loadingAppts && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {appointments.filter(a => a.status === "Confirmed").length} confirmed
          </Badge>
          <Badge variant="outline" className="gap-1 text-blue-600">
            <Clock className="h-3 w-3" />
            {appointments.filter(a => a.status === "Scheduled").length} pending
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6">

        {/* ── Left: Monthly Calendar ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">{MONTH_NAMES[viewMonth]} {viewYear}</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const iso = toISO(viewYear, viewMonth, day)
                  const isToday = iso === toISO(today.getFullYear(), today.getMonth(), today.getDate())
                  const isSelected = iso === selectedDate
                  const hasSlots = daysWithSlots.has(iso)
                  const hasAppts = daysWithAppts.has(iso)
                  const isPast = new Date(iso) < new Date(toISO(today.getFullYear(), today.getMonth(), today.getDate()))
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(iso)}
                      className={cn(
                        "relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-semibold transition-all",
                        isSelected ? "bg-blue-600 text-white shadow-md" :
                        isToday ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        isPast ? "text-slate-300 dark:text-slate-600" :
                        "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {day}
                      {/* dot indicators */}
                      <div className="flex gap-0.5 absolute bottom-1">
                        {hasSlots && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-blue-200" : "bg-emerald-400")} />}
                        {hasAppts && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-blue-200" : "bg-orange-400")} />}
                      </div>
                    </button>
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex gap-3 mt-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" />Slots open</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" />Appointments</span>
              </div>
            </CardContent>
          </Card>

          {/* ── Slot Manager for selected date ── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                </CardTitle>
                {!editingSlots ? (
                  <Button size="sm" variant="outline" onClick={startEditSlots} className="gap-1 text-xs h-7">
                    <Plus className="h-3 w-3" /> Set Slots
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingSlots(false)} className="h-7 text-xs"><X className="h-3 w-3" /></Button>
                    <Button size="sm" onClick={saveSlots} disabled={savingSlots} className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700">
                      {savingSlots ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {editingSlots ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Select the time slots you're available:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ALL_SLOTS.map(s => {
                      // Check if this slot is already booked — can't unbook it
                      const existingBooked = (monthSlots[selectedDate] ?? []).find(e => e.timeSlot === s.value && e.isBooked)
                      const isDraft = draftSlots.includes(s.value)
                      return (
                        <button
                          key={s.value}
                          disabled={!!existingBooked}
                          onClick={() => toggleDraftSlot(s.value)}
                          className={cn(
                            "text-[10px] py-1 px-1 rounded border font-medium transition-colors",
                            existingBooked ? "bg-orange-50 border-orange-200 text-orange-600 cursor-not-allowed" :
                            isDraft ? "bg-blue-600 border-blue-600 text-white" :
                            "border-slate-200 text-slate-500 hover:border-blue-300"
                          )}
                        >
                          {existingBooked ? "🔒" : ""} {s.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">🔒 = booked by patient, cannot remove</p>
                </div>
              ) : (
                <div>
                  {loadingSlots ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
                  ) : selectedSlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No slots set for this day.<br />Click "Set Slots" to add your availability.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {selectedSlots.map(s => (
                        <div key={s.timeSlot} className={cn(
                          "text-[10px] py-1 px-1 rounded border text-center font-medium",
                          s.isBooked ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        )}>
                          {s.isBooked ? "🔒" : "✓"} {ALL_SLOTS.find(a => a.value === s.timeSlot)?.label ?? s.timeSlot}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Appointments for selected date ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 dark:text-white">
              Appointments — {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <Badge>{dateAppts.length}</Badge>
          </div>

          {loadingAppts ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
          ) : dateAppts.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-500">No appointments on this day</p>
                <p className="text-xs text-muted-foreground mt-1">Set your availability above so patients can book slots</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {dateAppts.map(appt => (
                <Card key={appt.id} className={cn(
                  "border-l-4 transition-all",
                  appt.status === "Confirmed" ? "border-l-emerald-400" :
                  appt.status === "Scheduled" ? "border-l-blue-400" :
                  appt.status === "Cancelled" ? "border-l-red-400" : "border-l-slate-300"
                )}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Patient avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {(appt.patient_name || "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm">{appt.patient_name}</p>
                              {appt.is_real && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">LIVE</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{appt.appointment_time}</span>
                              {appt.type && <span className="flex items-center gap-1">{appt.type === "Video Call" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{appt.type}</span>}
                              {appt.fee && <span className="font-medium text-slate-700">₹{appt.fee}</span>}
                            </div>
                          </div>
                          <Badge className={cn("border text-[11px]", statusColor[appt.status] ?? "bg-slate-100")}>{appt.status}</Badge>
                        </div>

                        {/* Patient contact info */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 space-y-1">
                          {appt.patient_email && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5"><Mail className="h-3 w-3" />{appt.patient_email}</p>
                          )}
                          {appt.patient_contact && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5"><Phone className="h-3 w-3" />{appt.patient_contact}</p>
                          )}
                          {appt.specialty && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5"><Stethoscope className="h-3 w-3" />{appt.specialty}</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        {appt.status === "Scheduled" && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => confirmAppointment(appt.id)}
                              disabled={confirmingId === appt.id}
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
                            >
                              {confirmingId === appt.id
                                ? <><Loader2 className="h-3 w-3 animate-spin" /> Confirming…</>
                                : <><CheckCircle2 className="h-3 w-3" /> Confirm & Send Email</>
                              }
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50">
                              Decline
                            </Button>
                          </div>
                        )}
                        {appt.status === "Confirmed" && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed — patient email sent with meeting link</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* All upcoming appointments summary */}
          {appointments.filter(a => a.status === "Scheduled").length > 0 && (
            <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                      {appointments.filter(a => a.status === "Scheduled").length} pending appointment{appointments.filter(a => a.status === "Scheduled").length > 1 ? "s" : ""} need your confirmation
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Click a date on the calendar to view and confirm. Patient gets an email with meeting link immediately.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
