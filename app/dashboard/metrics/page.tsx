"use client"

import { useState } from "react"
import { format } from "date-fns"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Activity,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Filter,
  LineChart,
  Pill,
  Plus,
  Search,
  Thermometer,
  Droplets,
  Brain,
  Heart,
  CheckCircle,
  XCircle,
  BarChart3,
  ChevronUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HealthMetricsChart } from "@/components/metrics/health-metrics-chart"
import { SymptomTimeline } from "@/components/metrics/symptom-timeline"
import { MedicationTracker } from "@/components/metrics/medication-tracker"
import { HealthJournal } from "@/components/metrics/health-journal"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

// Sample health metrics data
const healthMetricsData = {
  user: {
    id: "user-123",
    name: "John Doe",
    age: 45,
    gender: "Male",
    diagnosis: "Basal Cell Condition (Stage I)",
    diagnosisDate: new Date(2023, 2, 15), // March 15, 2023
  },
  currentMetrics: {
    painLevel: 3,
    fatigue: 2,
    hydration: 7,
    appetite: 6,
    mood: 8,
    sleep: 7,
    lesionSize: 1.2, // cm
    lesionColor: "Light red",
    lesionTexture: "Slightly raised",
    temperature: 98.6, // Fahrenheit
  },
  medications: [
    {
      id: 1,
      name: "Fluorouracil 5% Cream",
      dosage: "Apply thin layer to affected area",
      frequency: "Twice daily",
      timeOfDay: ["Morning", "Evening"],
      startDate: new Date(2023, 2, 15),
      endDate: new Date(2023, 3, 30),
      status: "completed",
      adherence: 95,
      remainingDoses: 0,
      lastTaken: new Date(2023, 3, 30),
      nextDose: null,
    },
    {
      id: 2,
      name: "Imiquimod 5% Cream",
      dosage: "Apply thin layer to affected area",
      frequency: "5 times per week",
      timeOfDay: ["Evening"],
      startDate: new Date(2023, 4, 1),
      endDate: new Date(2023, 6, 31),
      status: "active",
      adherence: 88,
      remainingDoses: 24,
      lastTaken: new Date(2023, 5, 10),
      nextDose: new Date(2023, 5, 11),
    },
    {
      id: 3,
      name: "Vitamin D3 Supplement",
      dosage: "1000 IU",
      frequency: "Once daily",
      timeOfDay: ["Morning"],
      startDate: new Date(2023, 2, 15),
      endDate: null,
      status: "active",
      adherence: 97,
      remainingDoses: null, // ongoing
      lastTaken: new Date(2023, 5, 10),
      nextDose: new Date(2023, 5, 11),
    },
  ],
  healthLogs: [
    {
      date: new Date(2023, 5, 10),
      metrics: {
        painLevel: 3,
        fatigue: 2,
        hydration: 7,
        appetite: 6,
        mood: 8,
        sleep: 7,
        lesionSize: 1.2,
        lesionColor: "Light red",
        lesionTexture: "Slightly raised",
        temperature: 98.6,
      },
      notes: "Feeling better today. The cream seems to be working, and the lesion appears slightly smaller.",
      medicationsTaken: [2, 3],
      alerts: [],
    },
    {
      date: new Date(2023, 5, 9),
      metrics: {
        painLevel: 4,
        fatigue: 3,
        hydration: 6,
        appetite: 5,
        mood: 7,
        sleep: 6,
        lesionSize: 1.3,
        lesionColor: "Red",
        lesionTexture: "Raised",
        temperature: 98.8,
      },
      notes: "Slight discomfort around the lesion area. Applied the cream as directed.",
      medicationsTaken: [2, 3],
      alerts: [],
    },
    {
      date: new Date(2023, 5, 8),
      metrics: {
        painLevel: 5,
        fatigue: 4,
        hydration: 5,
        appetite: 4,
        mood: 6,
        sleep: 5,
        lesionSize: 1.4,
        lesionColor: "Red",
        lesionTexture: "Raised",
        temperature: 99.1,
      },
      notes: "Feeling more tired today. The lesion is slightly painful to touch.",
      medicationsTaken: [2, 3],
      alerts: [
        {
          type: "warning",
          message: "Your pain level has increased. Consider contacting your doctor if it continues to worsen.",
        },
      ],
    },
    {
      date: new Date(2023, 5, 7),
      metrics: {
        painLevel: 3,
        fatigue: 3,
        hydration: 6,
        appetite: 5,
        mood: 7,
        sleep: 6,
        lesionSize: 1.4,
        lesionColor: "Red",
        lesionTexture: "Raised",
        temperature: 98.7,
      },
      notes: "Normal day. No significant changes.",
      medicationsTaken: [2, 3],
      alerts: [],
    },
    {
      date: new Date(2023, 5, 6),
      metrics: {
        painLevel: 3,
        fatigue: 2,
        hydration: 7,
        appetite: 6,
        mood: 8,
        sleep: 7,
        lesionSize: 1.5,
        lesionColor: "Red",
        lesionTexture: "Raised",
        temperature: 98.6,
      },
      notes: "Feeling good today. Had more energy and was able to go for a walk.",
      medicationsTaken: [2, 3],
      alerts: [],
    },
  ],
  journalEntries: [
    {
      id: 1,
      date: new Date(2023, 5, 10),
      title: "Feeling optimistic",
      content:
        "Today was a good day. I noticed the lesion seems to be responding to treatment. It appears slightly smaller and less red. I've been diligent about applying the medication and staying hydrated. My energy levels are improving, and I was able to take a 30-minute walk without feeling too fatigued. I'm hopeful that this trend continues.",
      mood: "Positive",
      isPrivate: true,
    },
    {
      id: 2,
      date: new Date(2023, 5, 8),
      title: "Difficult day",
      content:
        "Today was challenging. I experienced more pain around the lesion area, and I felt more tired than usual. I made sure to take all my medications as prescribed, but I'm concerned about the increased discomfort. I'll monitor this over the next few days and contact my doctor if it doesn't improve. I tried to stay positive, but it was hard to focus on anything else.",
      mood: "Negative",
      isPrivate: true,
    },
    {
      id: 3,
      date: new Date(2023, 5, 5),
      title: "New diet impact",
      content:
        "I've been following the nutritionist's recommendations for three days now, focusing on anti-inflammatory foods and increasing my protein intake. I think it's making a difference in my energy levels. I feel less fatigued in the afternoons. The lesion hasn't changed much visibly, but the surrounding skin seems less irritated. I'll continue with this diet and see if the improvements continue.",
      mood: "Neutral",
      isPrivate: false,
    },
  ],
  historicalData: {
    painLevel: [
      { date: "May 1", value: 6 },
      { date: "May 8", value: 5 },
      { date: "May 15", value: 4 },
      { date: "May 22", value: 5 },
      { date: "May 29", value: 4 },
      { date: "Jun 5", value: 3 },
      { date: "Jun 10", value: 3 },
    ],
    fatigue: [
      { date: "May 1", value: 7 },
      { date: "May 8", value: 6 },
      { date: "May 15", value: 5 },
      { date: "May 22", value: 4 },
      { date: "May 29", value: 4 },
      { date: "Jun 5", value: 3 },
      { date: "Jun 10", value: 2 },
    ],
    lesionSize: [
      { date: "May 1", value: 2.1 },
      { date: "May 8", value: 1.9 },
      { date: "May 15", value: 1.8 },
      { date: "May 22", value: 1.7 },
      { date: "May 29", value: 1.6 },
      { date: "Jun 5", value: 1.4 },
      { date: "Jun 10", value: 1.2 },
    ],
    hydration: [
      { date: "May 1", value: 4 },
      { date: "May 8", value: 5 },
      { date: "May 15", value: 5 },
      { date: "May 22", value: 6 },
      { date: "May 29", value: 6 },
      { date: "Jun 5", value: 7 },
      { date: "Jun 10", value: 7 },
    ],
    mood: [
      { date: "May 1", value: 5 },
      { date: "May 8", value: 6 },
      { date: "May 15", value: 6 },
      { date: "May 22", value: 7 },
      { date: "May 29", value: 7 },
      { date: "Jun 5", value: 8 },
      { date: "Jun 10", value: 8 },
    ],
  },
  thresholds: {
    painLevel: { warning: 5, alert: 7 },
    fatigue: { warning: 6, alert: 8 },
    temperature: { warning: 99.5, alert: 100.5 },
    lesionSize: { warning: "increase", alert: "rapid increase" },
    hydration: { warning: 4, alert: 2 },
  },
}

export default function HealthMetricsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [showLogDialog, setShowLogDialog] = useState(false)
  const [showJournalDialog, setShowJournalDialog] = useState(false)
  const [showThresholdDialog, setShowThresholdDialog] = useState(false)
  const [timeframe, setTimeframe] = useState("week")
  const [journalTitle, setJournalTitle] = useState("")
  const [journalContent, setJournalContent] = useState("")
  const [journalMood, setJournalMood] = useState("Neutral")
  const [journalPrivate, setJournalPrivate] = useState(true)
  const [editingJournal, setEditingJournal] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMood, setFilterMood] = useState("all")

  // Health metrics form state
  const [painLevel, setPainLevel] = useState(healthMetricsData.currentMetrics.painLevel)
  const [fatigue, setFatigue] = useState(healthMetricsData.currentMetrics.fatigue)
  const [hydration, setHydration] = useState(healthMetricsData.currentMetrics.hydration)
  const [appetite, setAppetite] = useState(healthMetricsData.currentMetrics.appetite)
  const [mood, setMood] = useState(healthMetricsData.currentMetrics.mood)
  const [sleep, setSleep] = useState(healthMetricsData.currentMetrics.sleep)
  const [lesionSize, setLesionSize] = useState(healthMetricsData.currentMetrics.lesionSize.toString())
  const [lesionColor, setLesionColor] = useState(healthMetricsData.currentMetrics.lesionColor)
  const [lesionTexture, setLesionTexture] = useState(healthMetricsData.currentMetrics.lesionTexture)
  const [temperature, setTemperature] = useState(healthMetricsData.currentMetrics.temperature.toString())
  const [healthNotes, setHealthNotes] = useState("")
  const [selectedMedications, setSelectedMedications] = useState<number[]>([])

  // Threshold settings state
  const [thresholds, setThresholds] = useState(healthMetricsData.thresholds)

  // PDF report generation is handled by jsPDF directly

  // Function to handle saving health log
  const handleSaveHealthLog = () => {
    // Validate inputs
    if (!lesionSize || !lesionColor || !lesionTexture || !temperature) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields.",
      })
      return
    }

    // Check for potential health alerts
    const alerts = []

    if (painLevel >= thresholds.painLevel.alert) {
      alerts.push({
        type: "alert",
        message: "Your pain level is very high. Please contact your healthcare provider immediately.",
      })
    } else if (painLevel >= thresholds.painLevel.warning) {
      alerts.push({
        type: "warning",
        message: "Your pain level is elevated. Consider contacting your doctor if it continues.",
      })
    }

    if (Number.parseFloat(temperature) >= thresholds.temperature.alert) {
      alerts.push({
        type: "alert",
        message: "You have a high fever. Please contact your healthcare provider immediately.",
      })
    } else if (Number.parseFloat(temperature) >= thresholds.temperature.warning) {
      alerts.push({
        type: "warning",
        message: "You have a slight fever. Monitor your temperature and stay hydrated.",
      })
    }

    if (fatigue >= thresholds.fatigue.alert) {
      alerts.push({
        type: "alert",
        message: "Your fatigue level is very high. Please rest and contact your healthcare provider.",
      })
    } else if (fatigue >= thresholds.fatigue.warning) {
      alerts.push({
        type: "warning",
        message: "Your fatigue level is elevated. Try to get more rest.",
      })
    }

    if (hydration <= thresholds.hydration.alert) {
      alerts.push({
        type: "alert",
        message: "You are severely dehydrated. Please increase your fluid intake immediately.",
      })
    } else if (hydration <= thresholds.hydration.warning) {
      alerts.push({
        type: "warning",
        message: "You may be dehydrated. Try to drink more water.",
      })
    }

    // In a real app, this would save the log to the database
    // For this demo, we'll just show a success message
    toast({
      title: "Health metrics saved",
      description: "Your health data has been recorded successfully.",
    })

    // Show alerts if any
    alerts.forEach((alert) => {
      toast({
        variant: alert.type === "alert" ? "destructive" : "default",
        title: alert.type === "alert" ? "Health Alert" : "Health Warning",
        description: alert.message,
      })
    })

    // Reset form
    setShowLogDialog(false)
  }

  // Function to handle saving journal entry
  const handleSaveJournal = () => {
    if (!journalTitle || !journalContent) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide both a title and content for your journal entry.",
      })
      return
    }

    // In a real app, this would save the journal entry to the database
    // For this demo, we'll just show a success message
    toast({
      title: editingJournal ? "Journal entry updated" : "Journal entry saved",
      description: editingJournal
        ? "Your journal entry has been updated successfully."
        : "Your journal entry has been saved successfully.",
    })

    // Reset form
    setJournalTitle("")
    setJournalContent("")
    setJournalMood("Neutral")
    setJournalPrivate(true)
    setEditingJournal(null)
    setShowJournalDialog(false)
  }

  // Function to handle saving threshold settings
  const handleSaveThresholds = () => {
    // In a real app, this would save the threshold settings to the database
    // For this demo, we'll just show a success message
    toast({
      title: "Threshold settings saved",
      description: "Your health alert thresholds have been updated.",
    })

    setShowThresholdDialog(false)
  }

  // Function to toggle medication selection for health log
  const toggleMedicationSelection = (id: number) => {
    if (selectedMedications.includes(id)) {
      setSelectedMedications(selectedMedications.filter((medId) => medId !== id))
    } else {
      setSelectedMedications([...selectedMedications, id])
    }
  }

  // Function to edit journal entry
  interface JournalEntry {
    id: number;
    title: string;
    content: string;
    mood: string;
    isPrivate: boolean;
    date: Date;
  }

  const handleEditJournal = (entry: JournalEntry) => {
    setJournalTitle(entry.title)
    setJournalContent(entry.content)
    setJournalMood(entry.mood)
    setJournalPrivate(entry.isPrivate)
    setEditingJournal(entry.id)
    setShowJournalDialog(true)
  }

  // Function to download health report as PDF
  const handleDownloadReport = () => {
    // Define the type for jsPDF with autoTable plugin
    interface JsPDFWithAutoTable extends jsPDF {
      lastAutoTable?: {
        finalY: number;
      };
    }

    const doc = new jsPDF() as JsPDFWithAutoTable

    // Add header
    doc.setFontSize(20)
    doc.setTextColor(0, 102, 204)
    doc.text("Derma AI", 105, 20, { align: "center" })

    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text("Health Metrics Report", 105, 30, { align: "center" })

    // Add patient details
    doc.setFontSize(12)
    doc.text(`Patient: ${healthMetricsData.user.name}`, 20, 45)
    doc.text(`Age: ${healthMetricsData.user.age}`, 20, 55)
    doc.text(`Gender: ${healthMetricsData.user.gender}`, 20, 65)
    doc.text(`Diagnosis: ${healthMetricsData.user.diagnosis}`, 20, 75)
    doc.text(`Report Date: ${format(new Date(), "MMMM d, yyyy")}`, 150, 45)

    // Add current metrics section
    doc.setFontSize(14)
    doc.text("Current Health Metrics", 20, 95)
    doc.setFontSize(10)

    const currentMetricsData = [
      ["Metric", "Value", "Status"],
      ["Pain Level", `${painLevel}/10`, painLevel >= thresholds.painLevel.warning ? "⚠️ Warning" : "Normal"],
      ["Fatigue", `${fatigue}/10`, fatigue >= thresholds.fatigue.warning ? "⚠️ Warning" : "Normal"],
      ["Hydration", `${hydration}/10`, hydration <= thresholds.hydration.warning ? "⚠️ Warning" : "Normal"],
      ["Appetite", `${appetite}/10`, "Normal"],
      ["Mood", `${mood}/10`, "Normal"],
      ["Sleep Quality", `${sleep}/10`, "Normal"],
      ["Lesion Size", `${lesionSize} cm`, "Normal"],
      ["Lesion Color", lesionColor, "Normal"],
      ["Lesion Texture", lesionTexture, "Normal"],
      [
        "Temperature",
        `${temperature}°F`,
        Number.parseFloat(temperature) >= thresholds.temperature.warning ? "⚠️ Warning" : "Normal",
      ],
    ]

    autoTable(doc, {
      head: [currentMetricsData[0]],
      body: currentMetricsData.slice(1),
      startY: 100,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 102, 204] },
    })

    // Add historical data section
    // Use the return value from autoTable which contains the finalY position
    const finalY = (doc.lastAutoTable?.finalY || 100) + 15
    doc.setFontSize(14)
    doc.text("Health Trends (Last 30 Days)", 20, finalY)

    // Add medication section
    doc.setFontSize(14)
    doc.text("Current Medications", 20, finalY + 80)
    doc.setFontSize(10)

    const medicationData = healthMetricsData.medications
      .filter((med) => med.status === "active")
      .map((med) => [
        med.name,
        med.dosage,
        med.frequency,
        `${format(med.startDate, "MMM d, yyyy")} - ${med.endDate ? format(med.endDate, "MMM d, yyyy") : "Ongoing"}`,
        `${med.adherence}%`,
      ])

    autoTable(doc, {
      head: [["Medication", "Dosage", "Frequency", "Duration", "Adherence"]],
      body: medicationData,
      startY: finalY + 85,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 102, 204] },
    })
    
    // Add recent health logs
    const finalY2 = (doc.lastAutoTable?.finalY || finalY + 150) + 15;
    doc.setFontSize(14)
    doc.text("Recent Health Logs", 20, finalY2)
    const healthLogsData = healthMetricsData.healthLogs
      .slice(0, 5)
      .map((log) => [
        format(log.date, "MMM d, yyyy"),
        `Pain: ${log.metrics.painLevel}/10`,
        `Fatigue: ${log.metrics.fatigue}/10`,
        log.notes.substring(0, 50) + (log.notes.length > 50 ? "..." : ""),
      ])

    autoTable(doc, {
      head: [["Date", "Pain Level", "Fatigue", "Notes"]],
      body: healthLogsData,
      startY: finalY2 + 5,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 102, 204] },
    })

    // Add footer
    doc.setFontSize(8)
    doc.text("This report was generated by Derma AI for personal health tracking purposes.", 105, 280, {
      align: "center",
    })
    doc.text("Please share this report with your healthcare provider during your next appointment.", 105, 285, {
      align: "center",
    })

    // Save the PDF
    doc.save(`Health_Metrics_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`)

    toast({
      title: "Report downloaded",
      description: "Your health metrics report has been downloaded as a PDF.",
    })
  }

  // Function to export health data as CSV
  const handleExportCSV = () => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,"

    // Add headers
    csvContent +=
      "Date,Pain Level,Fatigue,Hydration,Appetite,Mood,Sleep,Lesion Size,Lesion Color,Lesion Texture,Temperature,Notes\n"

    // Add data rows
    healthMetricsData.healthLogs.forEach((log) => {
      const row = [
        format(log.date, "yyyy-MM-dd"),
        log.metrics.painLevel,
        log.metrics.fatigue,
        log.metrics.hydration,
        log.metrics.appetite,
        log.metrics.mood,
        log.metrics.sleep,
        log.metrics.lesionSize,
        `"${log.metrics.lesionColor}"`,
        `"${log.metrics.lesionTexture}"`,
        log.metrics.temperature,
        `"${log.notes.replace(/"/g, '""')}"`,
      ]
      csvContent += row.join(",") + "\n"
    })

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Health_Metrics_Data_${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)

    // Trigger download
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Data exported",
      description: "Your health metrics data has been exported as a CSV file.",
    })
  }

  // Filter journal entries based on search and mood filter
  const filteredJournalEntries = healthMetricsData.journalEntries
    .filter((entry) => {
      const matchesSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesMood = filterMood === "all" || entry.mood === filterMood

      return matchesSearch && matchesMood
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  // Get active medications
  const getActiveMedications = () => {
    return healthMetricsData.medications.filter((med) => med.status === "active")
  }

  // Get today's date
  const today = new Date()

  // Get medication due today
  const getMedicationsDueToday = () => {
    return getActiveMedications().filter((med) => {
      if (!med.nextDose) return false
      return isSameDay(med.nextDose, today)
    })
  }

  // Check if two dates are the same day
  function isSameDay(date1: Date, date2: Date) {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  // Get latest health log
  const getLatestHealthLog = () => {
    return healthMetricsData.healthLogs[0]
  }

  // Get health trend (improving, stable, worsening)
  const getHealthTrend = (metric: string) => {
    const data = healthMetricsData.historicalData[metric as keyof typeof healthMetricsData.historicalData]
    if (!data || data.length < 2) return "stable"

    const latest = data[data.length - 1].value
    const previous = data[data.length - 2].value

    // For pain, fatigue, lesionSize - lower is better
    if (metric === "painLevel" || metric === "fatigue" || metric === "lesionSize") {
      if (latest < previous) return "improving"
      if (latest > previous) return "worsening"
      return "stable"
    }

    // For hydration, mood - higher is better
    if (latest > previous) return "improving"
    if (latest < previous) return "worsening"
    return "stable"
  }

  // Get trend icon and color
  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case "improving":
        return { icon: <ChevronDown className="h-4 w-4 text-green-500" />, color: "text-green-500" }
      case "worsening":
        return { icon: <ChevronUp className="h-4 w-4 text-red-500" />, color: "text-red-500" }
      default:
        return { icon: <ChevronRight className="h-4 w-4 text-yellow-500" />, color: "text-yellow-500" }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Health Metrics & Medication</h2>
          <p className="text-muted-foreground">Track your health parameters and manage your medication schedule</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowThresholdDialog(true)}>
            <AlertCircle className="h-4 w-4" />
            Alert Settings
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowLogDialog(true)}>
            <Plus className="h-4 w-4" />
            Log Health Update
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowJournalDialog(true)}>
            <FileText className="h-4 w-4" />
            Add Journal Entry
          </Button>
        </div>
      </div>

      {/* Health Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">
                Health Overview
                <Badge className="ml-2" variant="outline">
                  Last updated: {format(getLatestHealthLog().date, "MMM d, yyyy")}
                </Badge>
              </CardTitle>
              <CardDescription>Summary of your current health status and metrics</CardDescription>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={handleDownloadReport}>
                <FileText className="h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Pain Level</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold">{getLatestHealthLog().metrics.painLevel}/10</span>
                  {getTrendDisplay(getHealthTrend("painLevel")).icon}
                </div>
              </div>
              <Progress
                value={getLatestHealthLog().metrics.painLevel * 10}
                className="h-2"
                color={
                  getLatestHealthLog().metrics.painLevel >= thresholds.painLevel.alert
                    ? "bg-red-500"
                    : getLatestHealthLog().metrics.painLevel >= thresholds.painLevel.warning
                      ? "bg-yellow-500"
                      : undefined
                }
              />
              <p className={cn("text-xs", getTrendDisplay(getHealthTrend("painLevel")).color)}>
                {getHealthTrend("painLevel") === "improving"
                  ? "Decreasing"
                  : getHealthTrend("painLevel") === "worsening"
                    ? "Increasing"
                    : "Stable"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Fatigue</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold">{getLatestHealthLog().metrics.fatigue}/10</span>
                  {getTrendDisplay(getHealthTrend("fatigue")).icon}
                </div>
              </div>
              <Progress
                value={getLatestHealthLog().metrics.fatigue * 10}
                className="h-2"
                color={
                  getLatestHealthLog().metrics.fatigue >= thresholds.fatigue.alert
                    ? "bg-red-500"
                    : getLatestHealthLog().metrics.fatigue >= thresholds.fatigue.warning
                      ? "bg-yellow-500"
                      : undefined
                }
              />
              <p className={cn("text-xs", getTrendDisplay(getHealthTrend("fatigue")).color)}>
                {getHealthTrend("fatigue") === "improving"
                  ? "Decreasing"
                  : getHealthTrend("fatigue") === "worsening"
                    ? "Increasing"
                    : "Stable"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Hydration</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold">{getLatestHealthLog().metrics.hydration}/10</span>
                  {getTrendDisplay(getHealthTrend("hydration")).icon}
                </div>
              </div>
              <Progress
                value={getLatestHealthLog().metrics.hydration * 10}
                className="h-2"
                color={
                  getLatestHealthLog().metrics.hydration <= thresholds.hydration.alert
                    ? "bg-red-500"
                    : getLatestHealthLog().metrics.hydration <= thresholds.hydration.warning
                      ? "bg-yellow-500"
                      : undefined
                }
              />
              <p className={cn("text-xs", getTrendDisplay(getHealthTrend("hydration")).color)}>
                {getHealthTrend("hydration") === "improving"
                  ? "Increasing"
                  : getHealthTrend("hydration") === "worsening"
                    ? "Decreasing"
                    : "Stable"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Mood</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold">{getLatestHealthLog().metrics.mood}/10</span>
                  {getTrendDisplay(getHealthTrend("mood")).icon}
                </div>
              </div>
              <Progress value={getLatestHealthLog().metrics.mood * 10} className="h-2" />
              <p className={cn("text-xs", getTrendDisplay(getHealthTrend("mood")).color)}>
                {getHealthTrend("mood") === "improving"
                  ? "Improving"
                  : getHealthTrend("mood") === "worsening"
                    ? "Declining"
                    : "Stable"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Lesion Status</h3>
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold">{getLatestHealthLog().metrics.lesionSize} cm</p>
                      {getTrendDisplay(getHealthTrend("lesionSize")).icon}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Color</p>
                    <p className="text-lg font-bold">{getLatestHealthLog().metrics.lesionColor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Texture</p>
                    <p className="text-lg font-bold">{getLatestHealthLog().metrics.lesionTexture}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Temperature</p>
                    <p className="text-lg font-bold">{getLatestHealthLog().metrics.temperature}°F</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Today&apos;s Medications</h3>
              {getMedicationsDueToday().length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">No medications due today</p>
                </div>
              ) : (
                <div className="rounded-lg border p-4">
                  <div className="space-y-3">
                    {getMedicationsDueToday().map((medication) => (
                      <div key={medication.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pill className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{medication.name}</p>
                            <p className="text-xs text-muted-foreground">{medication.dosage}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{medication.timeOfDay.join(" & ")}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Health Metrics</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="journal">Health Journal</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Health Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Health Trends
                </CardTitle>
                <CardDescription>Track how your key health metrics are changing over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <HealthMetricsChart
                  data={healthMetricsData.historicalData.painLevel}
                  dataKey="value"
                  name="Pain Level"
                  color="hsl(var(--primary))"
                />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("metrics")}>
                  View All Metrics
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Health Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Recent Health Logs
                </CardTitle>
                <CardDescription>Your most recent health updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {healthMetricsData.healthLogs.slice(0, 3).map((log, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{format(log.date, "MMMM d, yyyy")}</h4>
                          {log.alerts.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {log.alerts.length} Alert{log.alerts.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{log.notes}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            Pain: {log.metrics.painLevel}/10
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Fatigue: {log.metrics.fatigue}/10
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Lesion: {log.metrics.lesionSize} cm
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setShowLogDialog(true)}>
                  Log New Health Update
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Health Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Health Insights</CardTitle>
              <CardDescription>AI-free predictive insights based on your health data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4 text-center">
                    <div className="mb-2 rounded-full bg-primary/10 p-2">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium">Pain Trend</h3>
                    <p
                      className={cn(
                        "text-sm",
                        getHealthTrend("painLevel") === "improving"
                          ? "text-green-500"
                          : getHealthTrend("painLevel") === "worsening"
                            ? "text-red-500"
                            : "text-yellow-500",
                      )}
                    >
                      {getHealthTrend("painLevel") === "improving"
                        ? "Improving"
                        : getHealthTrend("painLevel") === "worsening"
                          ? "Worsening"
                          : "Stable"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {getHealthTrend("painLevel") === "improving"
                        ? "Your pain levels have been decreasing over the past week. Continue with your current treatment plan."
                        : getHealthTrend("painLevel") === "worsening"
                          ? "Your pain levels have been increasing. Consider consulting your doctor if this continues."
                          : "Your pain levels have remained stable. Continue monitoring and following your treatment plan."}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4 text-center">
                    <div className="mb-2 rounded-full bg-primary/10 p-2">
                      <Droplets className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium">Hydration Status</h3>
                    <p
                      className={cn(
                        "text-sm",
                        getHealthTrend("hydration") === "improving"
                          ? "text-green-500"
                          : getHealthTrend("hydration") === "worsening"
                            ? "text-red-500"
                            : "text-yellow-500",
                      )}
                    >
                      {getHealthTrend("hydration") === "improving"
                        ? "Improving"
                        : getHealthTrend("hydration") === "worsening"
                          ? "Worsening"
                          : "Adequate"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {getHealthTrend("hydration") === "improving"
                        ? "Your hydration levels have been improving. Keep up the good work!"
                        : getHealthTrend("hydration") === "worsening"
                          ? "Your hydration levels have been decreasing. Try to increase your water intake."
                          : "Your hydration levels are adequate. Continue to drink plenty of water."}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4 text-center">
                    <div className="mb-2 rounded-full bg-primary/10 p-2">
                      <Thermometer className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium">Fatigue Trend</h3>
                    <p
                      className={cn(
                        "text-sm",
                        getHealthTrend("fatigue") === "improving"
                          ? "text-green-500"
                          : getHealthTrend("fatigue") === "worsening"
                            ? "text-red-500"
                            : "text-yellow-500",
                      )}
                    >
                      {getHealthTrend("fatigue") === "improving"
                        ? "Improving"
                        : getHealthTrend("fatigue") === "worsening"
                          ? "Worsening"
                          : "Stable"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {getHealthTrend("fatigue") === "improving"
                        ? "Your energy levels have been improving. Continue with your current rest and activity balance."
                        : getHealthTrend("fatigue") === "worsening"
                          ? "Your fatigue has been increasing. Consider getting more rest and reducing strenuous activities."
                          : "Your energy levels have remained stable. Continue with your current routine."}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4 text-center">
                    <div className="mb-2 rounded-full bg-primary/10 p-2">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium">Mood Trend</h3>
                    <p
                      className={cn(
                        "text-sm",
                        getHealthTrend("mood") === "improving"
                          ? "text-green-500"
                          : getHealthTrend("mood") === "worsening"
                            ? "text-red-500"
                            : "text-yellow-500",
                      )}
                    >
                      {getHealthTrend("mood") === "improving"
                        ? "Improving"
                        : getHealthTrend("mood") === "worsening"
                          ? "Declining"
                          : "Stable"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {getHealthTrend("mood") === "improving"
                        ? "Your mood has been improving. Continue with activities that bring you joy."
                        : getHealthTrend("mood") === "worsening"
                          ? "Your mood has been declining. Consider engaging in activities you enjoy and connecting with loved ones."
                          : "Your mood has remained stable. Continue with your current self-care practices."}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4 text-center">
                    <div className="mb-2 rounded-full bg-primary/10 p-2">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium">Lesion Trend</h3>
                    <p
                      className={cn(
                        "text-sm",
                        getHealthTrend("lesionSize") === "improving"
                          ? "text-green-500"
                          : getHealthTrend("lesionSize") === "worsening"
                            ? "text-red-500"
                            : "text-yellow-500",
                      )}
                    >
                      {getHealthTrend("lesionSize") === "improving"
                        ? "Improving"
                        : getHealthTrend("lesionSize") === "worsening"
                          ? "Worsening"
                          : "Stable"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {getHealthTrend("lesionSize") === "improving"
                        ? "Your lesion size has been decreasing. The treatment appears to be effective."
                        : getHealthTrend("lesionSize") === "worsening"
                          ? "Your lesion size has been increasing. Please consult your doctor as soon as possible."
                          : "Your lesion size has remained stable. Continue with your current treatment plan."}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4 text-center">
                    <div className="mb-2 rounded-full bg-primary/10 p-2">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium">Overall Health</h3>
                    <p className="text-sm text-green-500">Gradually Improving</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Based on your overall metrics, your health appears to be gradually improving. Continue with your
                      treatment plan and maintain your healthy habits.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          {/* Timeframe Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 90 Days</SelectItem>
                  <SelectItem value="year">Last 365 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>

          {/* Metrics Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pain Level Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Pain Level
                </CardTitle>
                <CardDescription>Track your pain levels over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <HealthMetricsChart
                  data={healthMetricsData.historicalData.painLevel}
                  dataKey="value"
                  name="Pain Level"
                  color="hsl(var(--primary))"
                />
              </CardContent>
            </Card>

            {/* Fatigue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-primary" />
                  Fatigue
                </CardTitle>
                <CardDescription>Track your energy levels over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <HealthMetricsChart
                  data={healthMetricsData.historicalData.fatigue}
                  dataKey="value"
                  name="Fatigue"
                  color="#f97316"
                />
              </CardContent>
            </Card>

            {/* Lesion Size Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Lesion Size
                </CardTitle>
                <CardDescription>Track changes in lesion size over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <HealthMetricsChart
                  data={healthMetricsData.historicalData.lesionSize}
                  dataKey="value"
                  name="Size (cm)"
                  color="#ef4444"
                />
              </CardContent>
            </Card>

            {/* Hydration Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" />
                  Hydration
                </CardTitle>
                <CardDescription>Track your hydration levels over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <HealthMetricsChart
                  data={healthMetricsData.historicalData.hydration}
                  dataKey="value"
                  name="Hydration"
                  color="#0ea5e9"
                />
              </CardContent>
            </Card>
          </div>

          {/* Symptom Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Symptom Progression Timeline</CardTitle>
              <CardDescription>Visualize how your symptoms have changed over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
                <SymptomTimeline 
                  healthLogs={healthMetricsData.healthLogs.map(log => ({
                    date: log.date,
                    metrics: {
                      painLevel: log.metrics.painLevel,
                      fatigue: log.metrics.fatigue,
                      hydration: log.metrics.hydration,
                      appetite: log.metrics.appetite,
                      mood: log.metrics.mood,
                      sleep: log.metrics.sleep,
                      lesionSize: log.metrics.lesionSize,
                      temperature: log.metrics.temperature
                    },
                    alerts: log.alerts.map(alert => alert.message),
                    notes: log.notes
                  }))} 
                />
              </CardContent>
          </Card>

          {/* Health Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Health Logs</CardTitle>
              <CardDescription>Your recorded health updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthMetricsData.healthLogs.map((log, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{format(log.date, "MMMM d, yyyy")}</h3>
                      {log.alerts.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {log.alerts.length} Alert{log.alerts.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Health Metrics</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Pain Level:</p>
                            <p className="font-medium">{log.metrics.painLevel}/10</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Fatigue:</p>
                            <p className="font-medium">{log.metrics.fatigue}/10</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Hydration:</p>
                            <p className="font-medium">{log.metrics.hydration}/10</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Appetite:</p>
                            <p className="font-medium">{log.metrics.appetite}/10</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Mood:</p>
                            <p className="font-medium">{log.metrics.mood}/10</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sleep:</p>
                            <p className="font-medium">{log.metrics.sleep}/10</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Lesion Status</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Size:</p>
                            <p className="font-medium">{log.metrics.lesionSize} cm</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Color:</p>
                            <p className="font-medium">{log.metrics.lesionColor}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Texture:</p>
                            <p className="font-medium">{log.metrics.lesionTexture}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Temperature:</p>
                            <p className="font-medium">{log.metrics.temperature}°F</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {log.notes && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">{log.notes}</p>
                      </div>
                    )}

                    {log.alerts.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Alerts</h4>
                        <div className="space-y-2">
                          {log.alerts.map((alert, i) => (
                            <div
                              key={i}
                              className={cn(
                                "rounded-md p-3 text-sm",
                                alert.type === "alert"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                <p>{alert.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => setShowLogDialog(true)}>
                Log New Health Update
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Medication Schedule</CardTitle>
              <CardDescription>Track your medication intake and schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {healthMetricsData.medications.map((medication) => (
                  <MedicationTracker key={medication.id} medication={medication} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Medication Adherence */}
          <Card>
            <CardHeader>
              <CardTitle>Medication Adherence</CardTitle>
              <CardDescription>Track how consistently you&apos;re taking your medications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {healthMetricsData.medications.map((medication) => (
                  <div key={medication.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill className="h-5 w-5 text-primary" />
                        <span className="font-medium">{medication.name}</span>
                      </div>
                      <span className="font-medium">{medication.adherence}%</span>
                    </div>
                    <Progress
                      value={medication.adherence}
                      className="h-2"
                      color={
                        medication.adherence >= 90
                          ? "bg-green-500"
                          : medication.adherence >= 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {medication.adherence >= 90
                        ? "Excellent adherence! Keep up the good work."
                        : medication.adherence >= 70
                          ? "Good adherence. Try to be more consistent."
                          : "Poor adherence. Please try to take your medication as prescribed."}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Medication Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Medication Calendar</CardTitle>
              <CardDescription>View your medication schedule on a calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent 
                      mode="single" 
                      selected={selectedDate || undefined} 
                      onSelect={(date) => setSelectedDate(date || null)} 
                      initialFocus 
                      required={false} 
                    />
                  </PopoverContent>
                </Popover>

                {selectedDate && (
                  <div className="mt-6 w-full">
                    <h3 className="font-medium mb-4">Medications for {format(selectedDate, "MMMM d, yyyy")}</h3>
                    <div className="space-y-4">
                      {getActiveMedications().map((medication) => (
                        <div key={medication.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <Pill className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">{medication.name}</p>
                              <p className="text-xs text-muted-foreground">{medication.dosage}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{medication.timeOfDay.join(" & ")}</Badge>
                            <Button variant="outline" size="sm">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Journal Tab */}
        <TabsContent value="journal" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search journal entries..."
                  className="pl-8 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterMood} onValueChange={setFilterMood}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moods</SelectItem>
                  <SelectItem value="Positive">Positive</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                  <SelectItem value="Negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowJournalDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Journal Entry
            </Button>
          </div>

          {/* Journal Entries */}
          <div className="space-y-4">
            {filteredJournalEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No journal entries found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterMood !== "all"
                    ? "Try a different search term or filter"
                    : "Start journaling to track your health journey"}
                </p>
                <Button className="mt-4" onClick={() => setShowJournalDialog(true)}>
                  Create Your First Entry
                </Button>
              </div>
            ) : (
              <HealthJournal entries={filteredJournalEntries} onEdit={handleEditJournal} />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Log Health Update Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Log Health Update</DialogTitle>
            <DialogDescription>Record your current health metrics and symptoms</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Pain Level (0-10)</Label>
                <Slider
                  value={[painLevel]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(value) => setPainLevel(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No Pain</span>
                  <span>Severe Pain</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fatigue Level (0-10)</Label>
                <Slider value={[fatigue]} min={0} max={10} step={1} onValueChange={(value) => setFatigue(value[0])} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No Fatigue</span>
                  <span>Extreme Fatigue</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Hydration Level (0-10)</Label>
                <Slider
                  value={[hydration]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(value) => setHydration(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Dehydrated</span>
                  <span>Well Hydrated</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Appetite Level (0-10)</Label>
                <Slider value={[appetite]} min={0} max={10} step={1} onValueChange={(value) => setAppetite(value[0])} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No Appetite</span>
                  <span>Normal Appetite</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mood Level (0-10)</Label>
                <Slider value={[mood]} min={0} max={10} step={1} onValueChange={(value) => setMood(value[0])} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Very Low</span>
                  <span>Very Good</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sleep Quality (0-10)</Label>
                <Slider value={[sleep]} min={0} max={10} step={1} onValueChange={(value) => setSleep(value[0])} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Poor Sleep</span>
                  <span>Great Sleep</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lesion-size">Lesion Size (cm)</Label>
                <Input
                  id="lesion-size"
                  type="number"
                  step="0.1"
                  value={lesionSize}
                  onChange={(e) => setLesionSize(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesion-color">Lesion Color</Label>
                <Select value={lesionColor} onValueChange={setLesionColor}>
                  <SelectTrigger id="lesion-color">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Light red">Light red</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                    <SelectItem value="Dark red">Dark red</SelectItem>
                    <SelectItem value="Pink">Pink</SelectItem>
                    <SelectItem value="Brown">Brown</SelectItem>
                    <SelectItem value="Black">Black</SelectItem>
                    <SelectItem value="White">White</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesion-texture">Lesion Texture</Label>
                <Select value={lesionTexture} onValueChange={setLesionTexture}>
                  <SelectTrigger id="lesion-texture">
                    <SelectValue placeholder="Select texture" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flat">Flat</SelectItem>
                    <SelectItem value="Slightly raised">Slightly raised</SelectItem>
                    <SelectItem value="Raised">Raised</SelectItem>
                    <SelectItem value="Bumpy">Bumpy</SelectItem>
                    <SelectItem value="Scaly">Scaly</SelectItem>
                    <SelectItem value="Crusty">Crusty</SelectItem>
                    <SelectItem value="Ulcerated">Ulcerated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Body Temperature (°F)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Medications Taken Today</Label>
              <div className="space-y-2">
                {getActiveMedications().map((medication) => (
                  <div key={medication.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`med-${medication.id}`}
                      checked={selectedMedications.includes(medication.id)}
                      onChange={() => toggleMedicationSelection(medication.id)}
                      className="h-4 w-4 rounded border-gray-300"
                      aria-label={`Take ${medication.name}`}
                    />
                    <Label htmlFor={`med-${medication.id}`} className="text-sm font-normal">
                      {medication.name} ({medication.dosage})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Describe how you're feeling today, any changes in symptoms, etc."
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveHealthLog}>Save Health Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journal Entry Dialog */}
      <Dialog open={showJournalDialog} onOpenChange={setShowJournalDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingJournal ? "Edit Journal Entry" : "New Journal Entry"}</DialogTitle>
            <DialogDescription>
              Record your thoughts, experiences, and observations about your health journey
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="journal-title">Title</Label>
              <Input
                id="journal-title"
                placeholder="Give your entry a title"
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="journal-content">Content</Label>
              <Textarea
                id="journal-content"
                placeholder="Write your thoughts, observations, and experiences..."
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                rows={8}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="journal-mood">Mood</Label>
                <Select value={journalMood} onValueChange={setJournalMood}>
                  <SelectTrigger id="journal-mood">
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Positive">Positive</SelectItem>
                    <SelectItem value="Neutral">Neutral</SelectItem>
                    <SelectItem value="Negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch id="journal-private" checked={journalPrivate} onCheckedChange={setJournalPrivate} />
                <Label htmlFor="journal-private">Keep this entry private</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJournalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveJournal}>{editingJournal ? "Update Entry" : "Save Entry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Health Alert Thresholds Dialog */}
      <Dialog open={showThresholdDialog} onOpenChange={setShowThresholdDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Health Alert Settings</DialogTitle>
            <DialogDescription>Customize when you receive alerts based on your health metrics</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pain Level Thresholds</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pain-warning" className="text-xs">
                    Warning Level
                  </Label>
                  <Input
                    id="pain-warning"
                    type="number"
                    min="0"
                    max="10"
                    value={thresholds.painLevel.warning}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        painLevel: {
                          ...thresholds.painLevel,
                          warning: Number.parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pain-alert" className="text-xs">
                    Alert Level
                  </Label>
                  <Input
                    id="pain-alert"
                    type="number"
                    min="0"
                    max="10"
                    value={thresholds.painLevel.alert}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        painLevel: {
                          ...thresholds.painLevel,
                          alert: Number.parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You&apos;ll receive a warning when pain reaches {thresholds.painLevel.warning}/10 and an alert at{" "}
                {thresholds.painLevel.alert}/10
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fatigue Thresholds</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fatigue-warning" className="text-xs">
                    Warning Level
                  </Label>
                  <Input
                    id="fatigue-warning"
                    type="number"
                    min="0"
                    max="10"
                    value={thresholds.fatigue.warning}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        fatigue: {
                          ...thresholds.fatigue,
                          warning: Number.parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatigue-alert" className="text-xs">
                    Alert Level
                  </Label>
                  <Input
                    id="fatigue-alert"
                    type="number"
                    min="0"
                    max="10"
                    value={thresholds.fatigue.alert}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        fatigue: {
                          ...thresholds.fatigue,
                          alert: Number.parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Temperature Thresholds (°F)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temp-warning" className="text-xs">
                    Warning Level
                  </Label>
                  <Input
                    id="temp-warning"
                    type="number"
                    step="0.1"
                    value={thresholds.temperature.warning}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        temperature: {
                          ...thresholds.temperature,
                          warning: Number.parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp-alert" className="text-xs">
                    Alert Level
                  </Label>
                  <Input
                    id="temp-alert"
                    type="number"
                    step="0.1"
                    value={thresholds.temperature.alert}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        temperature: {
                          ...thresholds.temperature,
                          warning: Number.parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hydration Thresholds</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hydration-warning" className="text-xs">
                    Warning Level
                  </Label>
                  <Input
                    id="hydration-warning"
                    type="number"
                    min="0"
                    max="10"
                    value={thresholds.hydration.warning}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        hydration: {
                          ...thresholds.hydration,
                          warning: Number.parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hydration-alert" className="text-xs">
                    Alert Level
                  </Label>
                  <Input
                    id="hydration-alert"
                    type="number"
                    min="0"
                    max="10"
                    value={thresholds.hydration.alert}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        hydration: {
                          ...thresholds.hydration,
                          alert: Number.parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                For hydration, lower values trigger alerts (dehydration warning)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowThresholdDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveThresholds}>Save Alert Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

