"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, HeartPulse, Sparkles, Activity } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const formSchema = z.object({
  firstName: z.string().min(2, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  contactNumber: z.string().min(5, "Contact Number is required"),
  gender: z.string().min(1, "Please select your gender"),
  weight: z.string().min(1, "Weight is required"),
  height: z.string().min(1, "Height is required"),
  skinType: z.string().min(1, "Please select your skin type"),
  skinConcern: z.string().min(1, "Please select your primary skin concern"),
  currentMedications: z.string().optional(),
  knownAllergies: z.string().optional(),
  familyHistory: z.string().optional(),
  lifestyle: z.string().optional(),
})

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<{ fullName?: string; isOnboarded?: boolean; role?: string; _dbOffline?: boolean } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      contactNumber: "",
      gender: "",
      weight: "",
      height: "",
      skinType: "",
      skinConcern: "",
      currentMedications: "",
      knownAllergies: "",
      familyHistory: "",
      lifestyle: "",
    },
  })

  useEffect(() => {
    async function checkProfile() {
      try {
        const response = await fetch("/api/profile")
        if (response.ok) {
          const profile = await response.json()
          setUserProfile(profile)
          
          // Redirect if onboarded OR if DB is offline (don't block user at onboarding)
          if (profile.isOnboarded || profile._dbOffline) {
            router.push(profile.role === "doctor" ? "/doctor-dashboard" : "/dashboard")
            return
          }
          
          // Pre-fill standard fields if they exist
          if (profile.fullName) {
             const parts = profile.fullName.split(' ');
             form.setValue("firstName", parts[0] || "");
             form.setValue("lastName", parts.slice(1).join(' ') || "");
          }
          if (profile.contactNumber) form.setValue("contactNumber", profile.contactNumber)
          if (profile.gender) form.setValue("gender", profile.gender)
        } else if (response.status === 404) {
          // Profile doesn't exist yet — stay on onboarding page to create it
          console.log("No profile yet — showing onboarding form")
        } else {
          toast.error("Error", { description: "Failed to load profile. Please log in again." })
          router.push("/login")
          return
        }
      } catch (err) {
        console.error("Profile check error:", err)
      } finally {
        setLoading(false)
      }
    }

    checkProfile()
  }, [router, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSaving(true)
    
    // Separate standard profile fields and medical info JSON
    const payload = {
      fullName: `${values.firstName.trim()} ${values.lastName.trim()}`,
      contactNumber: values.contactNumber,
      gender: values.gender,
      isOnboarded: true,
      medicalInfo: {
        weight: values.weight,
        height: values.height,
        skinType: values.skinType,
        skinConcern: values.skinConcern,
        currentMedications: values.currentMedications || "None",
        knownAllergies: values.knownAllergies || "None",
        familyHistory: values.familyHistory || "None",
        lifestyle: values.lifestyle || "None",
      }
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success("Welcome aboard!", { description: "Your health profile has been verified." })
        // Use a hard window navigation to completely destroy Next.js soft-routing cache 
        // to prevent getting bounced back to the onboarding page!
        const role = userProfile?.role || "patient"
        window.location.href = role === "doctor" ? "/doctor-dashboard" : "/dashboard"
      } else {
        throw new Error("Failed to save profile")
      }
    } catch (error) {
      toast.error("Error saving profile", { description: "Please try submitting again." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-3xl w-full space-y-8 bg-background p-8 rounded-2xl shadow-xl border">
        
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">
            Complete Your Medical Profile
          </h2>
          <p className="text-muted-foreground text-lg">
            Hi {userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'there'}, let's get to know your skin a bit better before we start! 
            This information 100% private and helps the AI give you personalized care.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b">
              {/* Basic Demographics */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-red-500" /> Basic Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Enter contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 70" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 175" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Skin Profile */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" /> Skin Profile
                </h3>

                <FormField
                  control={form.control}
                  name="skinType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skin Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your skin type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Dry">Dry</SelectItem>
                          <SelectItem value="Oily">Oily</SelectItem>
                          <SelectItem value="Combination">Combination</SelectItem>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Sensitive">Sensitive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skinConcern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Skin Concern</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="What matters most?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Acne">Acne or Breakouts</SelectItem>
                          <SelectItem value="Aging">Anti-Aging / Fine Lines</SelectItem>
                          <SelectItem value="Pigmentation">Pigmentation / Dark Spots</SelectItem>
                          <SelectItem value="Redness">Redness / Rosacea</SelectItem>
                          <SelectItem value="Suspicious Moles">Suspicious Moles / Lesions</SelectItem>
                          <SelectItem value="None">Just maintaining healthy skin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Medical History */}
            <div className="space-y-4">
               <h3 className="text-lg font-semibold">Additional Context (Optional)</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="currentMedications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Medications</FormLabel>
                        <FormControl>
                          <Input placeholder="Any active prescriptions?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="knownAllergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Known Allergies</FormLabel>
                        <FormControl>
                          <Input placeholder="Drugs, latex, food allergies..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="familyHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family Medical History</FormLabel>
                        <FormControl>
                          <Input placeholder="Skin cancer, diabetes, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lifestyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lifestyle (Smoking/Alcohol)</FormLabel>
                        <FormControl>
                          <Input placeholder="Non-smoker, occasional drinker..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>
            </div>

            <Button type="submit" className="w-full text-lg py-6" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving secure profile...
                </>
              ) : (
                "Save and Go to Dashboard"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
