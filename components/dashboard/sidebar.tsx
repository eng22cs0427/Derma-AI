"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Activity,
  Calendar,
  ChevronRight,
  Home,
  Menu,
  Settings,
  ShoppingBag,
  User,
  Users,
  Microscope,
  ShieldCheck,
  Ticket,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
  },
  {
    title: "Skin Condition Analysis",
    icon: Microscope,
    href: "/dashboard/analysis",
  },
  {
    title: "My Skin Tickets",
    icon: Ticket,
    href: "/dashboard/skin-tickets",
  },
  {
    title: "Dermatologist Appointments",
    icon: Calendar,
    href: "/dashboard/appointments",
  },
  {
    title: "Medical Shop",
    icon: ShoppingBag,
    href: "/dashboard/shop",
  },
  {
    title: "Profile",
    icon: User,
    href: "/dashboard/profile",
  },
]


export function DashboardSidebar({ isAdmin = false, isCollapsed = false, onToggleCollapse }: { isAdmin?: boolean, isCollapsed?: boolean, onToggleCollapse?: () => void }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const SidebarContent = () => (
    <nav className="flex-1 space-y-1 p-4">
      {menuItems.map((item) => {
        const isActive = item.href === "/dashboard" 
          ? pathname === "/dashboard" 
          : (pathname === item.href || pathname.startsWith(item.href + "/"))
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="flex-1">{item.title}</span>}

              {isActive && !isCollapsed && <ChevronRight className="ml-auto h-4 w-4" />}
            </div>
          </Link>
        )
      })}

      
      {/* Admin Panel Link — visible ONLY to the specific admin email */}
      {isAdmin && (
        <Link href="/admin/doctors">
          <div className={cn(
            "mt-6 flex items-center gap-3 rounded-lg py-2 text-sm font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/60 shadow-sm border border-purple-200 dark:border-purple-800",
            isCollapsed ? "justify-center px-0" : "px-3"
          )}>
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Admin Panel</span>}
          </div>
        </Link>
      )}
    </nav>
  )

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="h-14 border-b px-4">
            <SheetTitle className="flex items-center gap-2">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <Activity className="h-6 w-6 text-primary" />
                <span>DermaAI</span>
              </Link>
            </SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex h-screen flex-col fixed left-0 top-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 z-40",
        isCollapsed ? "w-[70px]" : "w-64"
      )}>
        <div className={cn("flex h-14 items-center border-b px-4", isCollapsed ? "justify-center" : "justify-between")}>
          <Link href="/dashboard" className={cn("flex items-center gap-2 font-semibold", isCollapsed && "hidden")}>
            <Activity className="h-6 w-6 text-primary shrink-0" />
            <span>DermaAI</span>
          </Link>
          {isCollapsed && (
             <Link href="/dashboard" className="flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary shrink-0" />
             </Link>
          )}
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" onClick={onToggleCollapse} className={cn("hidden lg:flex", isCollapsed ? "mt-4 mb-2" : "")}>
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <SidebarContent />
      </div>
    </>
  )
}

