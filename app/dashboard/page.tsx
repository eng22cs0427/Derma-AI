"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Activity,
  Calendar,
  ShoppingBag,
  User,
  Users,
  Microscope,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Ticket,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProfile } from "@/contexts/ProfileContext"

// Banner data for the carousel
const banners = [
  {
    title: "AI-Powered Skin Analysis",
    description: "Get instant, accurate analysis of skin conditions using our advanced machine learning algorithms",
    color: "from-blue-500 to-blue-600",
    image: "https://firebasestorage.googleapis.com/v0/b/core-prd-frontend-images/o/skin-consultant%2F3302%2Fbranding%2F5b6072a9-7272-48b9-b4ea-e9ed2c539908.jpg?alt=media&token=6124daec-37bb-4316-8f5f-537874c2a315",
  },
  {
    title: "Connect with Expert Dermatologists",
    description: "Schedule consultations with qualified specialists for personalized care and treatment",
    color: "from-purple-500 to-purple-600",
    image: "https://buddycoins-rewards.medibuddy.in/rewards/Gold-Banner.png",
  },
  {
    title: "Track Your Skin Health Journey",
    description: "Monitor your progress, manage appointments, and access your complete medical history",
    color: "from-green-500 to-green-600",
    image: "https://imgs.search.brave.com/feKEI3pECVcNjrdeUF461HEasknCKgowyC5agCoczjI/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/cHJvZC53ZWJzaXRl/LWZpbGVzLmNvbS81/ZTliNTY3ODliYTU5/OWU2NzlmZTAyYWMv/NjI1NDMzNTM1NzMz/YzE1NWVlOTNhOTA4/X21vY2t1cC1vZi1h/LW1hbi11c2luZy1o/aXMtaXBob25lLTEx/LXByby1pbi1mcm9u/dC1vZi1oaXMtb2Zm/aWNlLWRlc2stMjE1/MS1lbDEtMy5wbmc",
  },
  {
    title: "Comprehensive Medical Shop",
    description: "Access recommended skincare products and medical supplies from trusted providers",
    color: "from-pink-500 to-pink-600",
    image: "https://antdisplay.com/pub/media/magefan_blog/QZ__NFP_T0_J_RFTDRB1_W2.png",
  },
]

// Feature cards data
const features = [
    {
      title: "Skin Condition Analysis",
      description: "Upload images for AI-powered Skin Disease detection",
      icon: Microscope,
      href: "/dashboard/analysis",
      color: "bg-blue-100",
      iconColor: "text-blue-500",
    },
    {
      title: "Dermatologist Appointments",
      description: "Schedule consultations with skin cancer specialists",
      icon: Calendar,
      href: "/dashboard/appointments",
      color: "bg-green-100",
      iconColor: "text-green-500",
    },
    // {
    //   title: "Treatment Plans",
    //   description: "View and manage your personalized treatment plans",
    //   icon: Activity,
    //   href: "/dashboard/treatment",
    //   color: "bg-purple-100",
    //   iconColor: "text-purple-500",
    // },
    // {
    //   title: "Health Metrics & Medication",
    //   description: "Track health indicators and manage medications",
    //   icon: Pill,
    //   href: "/dashboard/metrics",
    //   color: "bg-red-100",
    //   iconColor: "text-red-500",
    // },

    {
      title: "My Skin Tickets",
      description: "View and manage your active support tickets",
      icon: Ticket,
      href: "/dashboard/skin-tickets",
      color: "bg-purple-100",
      iconColor: "text-purple-500",
    },
    {
      title: "Medical Shop",
      description: "Purchase recommended medical supplies and products",
      icon: ShoppingBag,
      href: "/dashboard/shop",
      color: "bg-pink-100",
      iconColor: "text-pink-500",
    },
    {
      title: "Profile & Settings",
      description: "Manage your account and preferences",
      icon: User,
      href: "/dashboard/profile",
      color: "bg-gray-100",
      iconColor: "text-gray-500",
    },
  
]

export default function DashboardPage() {
  const [currentBanner, setCurrentBanner] = useState(0)

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length)
  }

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length)
  }

  // Auto-advance banner every 5 seconds
  useEffect(() => {
    const timer = setInterval(nextBanner, 5000)
    return () => clearInterval(timer)
  }, [])

  const { profile } = useProfile()
  const firstName = profile?.fullName?.split(' ')[0] || ""
  
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening"

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 rounded-3xl p-8 sm:p-10 text-white shadow-xl overflow-hidden border border-emerald-400">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Activity className="w-72 h-72" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium border border-white/30 text-white shadow-sm mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight drop-shadow-md">
            {greeting}{firstName ? `, ${firstName}` : "!"} 
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl font-medium drop-shadow-sm">
            Welcome to your personalized DermaAI hub. Let's take care of your skin health today.
          </p>
        </div>
      </div>

     {/* Feature Banner Carousel */}
<div className="relative overflow-hidden rounded-2xl shadow-lg">
  <div className="relative h-[320px] w-full">
    {banners.map((banner, index) => (
      <div
        key={index}
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          currentBanner === index ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      >
        <div
          className={`h-full w-full bg-gradient-to-r ${banner.color} p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center gap-4 rounded-2xl`}
        >
          {/* Left Section - Text */}
          <div className="w-full md:w-1/2 text-white space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold">{banner.title}</h2>
            <p className="text-base sm:text-lg text-white/90">
              {banner.description}
            </p>
          </div>

          {/* Right Section - Image */}
          <div className="w-full md:w-1/2 h-[200px] md:h-[260px] aspect-[4/3]">
            <img
              src={banner.image || "/placeholder.svg"}
              alt={banner.title}
              className="w-full h-full object-cover object-center rounded-xl shadow-md transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      </div>
    ))}
  </div>

  {/* Navigation Buttons */}
  <Button
    variant="ghost"
    size="icon"
    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full z-20"
    onClick={prevBanner}
  >
    <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full z-20"
    onClick={nextBanner}
  >
    <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
  </Button>

  {/* Dots Indicator */}
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
    {banners.map((_, index) => (
      <button
        key={index}
        aria-label={`Go to banner ${index + 1}`}
        className={`h-2 rounded-full transition-all ${
          currentBanner === index ? "w-6 bg-white" : "w-2 bg-white/50"
        }`}
        onClick={() => setCurrentBanner(index)}
      />
    ))}
  </div>
</div>


      {/* Feature Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Link key={feature.title} href={feature.href}>
            <Card className="h-full transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Get Started
                  <span className="ml-2">→</span>
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Additional Features Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Why Choose DermaAI?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Microscope className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Advanced AI Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  State-of-the-art machine learning for accurate skin condition detection
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Expert Dermatologists</h4>
                <p className="text-sm text-muted-foreground">
                  Connect with qualified specialists for personalized care
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Comprehensive Care</h4>
                <p className="text-sm text-muted-foreground">Complete solution for skin health management</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Latest Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium">New AI Model Released</p>
              <p className="text-sm text-muted-foreground">
                Our latest AI model achieves a right accuracy in skin condition detection
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Expanded Doctor Network</p>
              <p className="text-sm text-muted-foreground">
                Now featuring over 10+ specialized dermatologists across India
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Enhanced Telemedicine</p>
              <p className="text-sm text-muted-foreground">Improved video consultation experience with new features</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

