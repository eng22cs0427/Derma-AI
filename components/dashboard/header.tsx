"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Bell, Search, Calendar, Info, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { UserButton } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

interface PlainUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  imageUrl: string | null
}

interface PatientNotification {
  id: string
  title: string
  message: string
  type: string
  doctorName: string
  date: string
  link?: string
  read: boolean
}

export function DashboardHeader({ user }: { user: PlainUser | null }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState<PatientNotification[]>([])
  const [notifCount, setNotifCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/patient/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setNotifCount(data.count || 0)
      }
    } catch {
      // silent fail
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <form onSubmit={handleSearch} className="relative w-full max-w-sm lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search medical information..."
                className="w-full bg-background pl-8 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
              >
                <span className="sr-only">Search</span>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className={cn("h-5 w-5", notifCount > 0 ? "text-blue-500" : "")} />
                {notifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                <h4 className="font-semibold text-sm">Notifications</h4>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="flex flex-col space-y-4 p-8 items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                    <p className="text-sm text-slate-500 font-medium">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={cn("p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3", !n.read && "bg-blue-50/50 dark:bg-blue-900/10")}>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", n.type === "Appointment" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600")}>
                        {n.type === "Appointment" ? <Calendar className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-2">{new Date(n.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <UserButton />
        </div>
      </div>
    </header>
  )
}
