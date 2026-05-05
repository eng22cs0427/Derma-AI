"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Users,
  Microscope,
  Calendar,
  LayoutDashboard,
  ChevronRight,
  Menu,
  X,
  Stethoscope,
  Bell,
  Search,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
  AlertCircle,
} from "lucide-react"

import { UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Overview", icon: LayoutDashboard, href: "/doctor-dashboard", exact: true },
  { title: "All Patients", icon: Users, href: "/doctor-dashboard/patients" },
  { title: "AI Analyses", icon: Microscope, href: "/doctor-dashboard/analyses" },
  { title: "Appointments", icon: Calendar, href: "/doctor-dashboard/appointments" },
  { title: "My Profile", icon: User, href: "/doctor-dashboard/profile" },
]

type Notification = {
  id: string
  patientName: string
  patientEmail: string
  diagnosis?: string
  riskLevel?: string
  date: string
  message: string
  type: string
  link: string
  title?: string
}

function getRiskColor(risk: string) {
  if ((risk || "").includes("Very High")) return "text-red-600"
  if ((risk || "").includes("High")) return "text-orange-500"
  if ((risk || "").includes("Medium")) return "text-yellow-600"
  return "text-emerald-600"
}

function getRiskIcon(risk: string) {
  if ((risk || "").includes("High")) return <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
  return <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
}

export function DoctorShell({ children, isAdmin = false }: { children: React.ReactNode, isAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [doctorName, setDoctorName] = useState("Doctor")
  const [doctorSpecialty, setDoctorSpecialty] = useState("Dermatologist")
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null)

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifCount, setNotifCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const [lastSeen, setLastSeen] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("doctor_notif_last_seen") || "" : ""
  )
  const notifRef = useRef<HTMLDivElement>(null)

  // Fetch doctor profile
  useEffect(() => {
    fetch("/api/doctor/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          if (d.fullName) setDoctorName(d.fullName.split(" ")[0])
          if (d.specialty) setDoctorSpecialty(d.specialty)
          setProfileComplete(d._dbOffline ? true : (d.profileComplete ?? false))
        }
      })
      .catch(() => {})
  }, [])

  // Poll notifications every 30 seconds
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/doctor/notifications")
      if (!res.ok) return
      const data = await res.json()
      const notifs: Notification[] = data.notifications || []
      setNotifications(notifs)
      // Count as "new" any notification newer than lastSeen timestamp
      const newCount = lastSeen
        ? notifs.filter(n => new Date(n.date) > new Date(lastSeen)).length
        : notifs.length
      setNotifCount(newCount)
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [lastSeen])

  // Close notif panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const openNotifPanel = () => {
    setNotifOpen(v => {
      if (!v) {
        // Mark all as seen
        const now = new Date().toISOString()
        setLastSeen(now)
        if (typeof window !== "undefined") localStorage.setItem("doctor_notif_last_seen", now)
        setNotifCount(0)
      }
      return !v
    })
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <Link href="/doctor-dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div className="leading-none">
              <p className="font-bold text-sm text-slate-900 dark:text-white">DermaAI</p>
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mt-0.5">Doctor Portal</p>
            </div>
          </Link>
          <button
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav Label */}
        <div className="px-4 pt-5 pb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navigation</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                <div
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110", isActive && "text-blue-600")} />
                  <span className="flex-1">{item.title}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </div>
              </Link>
            )
          })}

          {/* Admin Panel Link — visible ONLY to the specific admin email */}
          {isAdmin && (
            <Link href="/admin/doctors" onClick={() => setSidebarOpen(false)}>
              <div className="mt-4 group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-150 text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/60 shadow-sm border border-purple-200 dark:border-purple-800">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">Admin Panel</span>
              </div>
            </Link>
          )}
          {/* Profile incomplete warning — shown in sidebar until doctor fills all fields */}
          {profileComplete === false && !pathname.startsWith("/doctor-dashboard/profile") && (
            <Link href="/doctor-dashboard/profile" onClick={() => setSidebarOpen(false)}>
              <div className="mx-1 mt-2 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Profile Incomplete</p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">Fill mandatory fields to unlock all features</p>
                </div>
              </div>
            </Link>
          )}
        </nav>

        {/* Sidebar Footer — notification summary */}
        {notifCount > 0 && (
          <div className="mx-3 mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs font-bold text-red-700 dark:text-red-300">
                {notifCount} new {notifCount === 1 ? "analysis" : "analyses"}
              </p>
            </div>
            <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-0.5 ml-6">
              Patients have submitted new skin scans
            </p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden sm:flex flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search patients, diagnoses..."
              className="pl-9 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">

            {/* ── Notification Bell ─────────────────── */}
            <div className="relative" ref={notifRef}>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={openNotifPanel}
                aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} new)` : ""}`}
              >
                <Bell className={cn("h-5 w-5", notifCount > 0 ? "text-red-500" : "text-slate-600 dark:text-slate-400")} />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </Button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Patient Analysis Alerts</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Last 24h</span>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                        <p className="text-sm font-semibold text-slate-500">All clear</p>
                        <p className="text-xs text-slate-400 mt-0.5">No new notifications today</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                          onClick={() => {
                            setNotifOpen(false)
                            router.push(n.link || "/doctor-dashboard")
                          }}
                        >
                          {/* Avatar */}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5",
                            n.type === 'Appointment' ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"
                          )}>
                            {(n.patientName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                              {n.type === 'Appointment' ? n.title : n.patientName}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {n.type === 'Appointment' ? n.message : n.diagnosis}
                            </p>
                            {n.type !== 'Appointment' && n.riskLevel && (
                              <div className={cn("flex items-center gap-1 mt-1 text-xs font-bold", getRiskColor(n.riskLevel))}>
                                {getRiskIcon(n.riskLevel)}
                                {n.riskLevel} Risk
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(n.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 text-center transition-colors py-1"
                      onClick={() => { setNotifOpen(false); router.push("/doctor-dashboard/analyses") }}
                    >
                      View all analyses →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Doctor Profile — visible top-right */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
              <div className="hidden sm:flex flex-col items-end leading-none">
                <span className="text-sm font-bold text-slate-800 dark:text-white">Dr. {doctorName}</span>
                <span className="text-[11px] text-blue-500 font-semibold mt-0.5">{doctorSpecialty}</span>
              </div>
              <div className="relative">
                <div className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <Stethoscope className="h-2 w-2 text-white" />
                </div>
                <UserButton />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
