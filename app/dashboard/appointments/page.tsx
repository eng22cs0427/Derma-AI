"use client"

import type React from "react"

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  Search,
  Bell,
  Star,
  Video,
  Upload,
  Check,
  Stethoscope,
  X,
  AlertCircle,
  Download,
  Info
} from "lucide-react"
import { format, addDays } from "date-fns"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useMedicalHistory } from "@/contexts/MedicalHistoryContext";
import { useProfile } from "@/contexts/ProfileContext";

// Add the Doctor interface
interface Doctor {
  id: number;
  name: string;
  specialty: string;
  subspecialty: string;
  hospital: string;
  rating: number;
  reviews: number;
  experience: number;
  image: string;
  availableToday: boolean;
  nextAvailable: string;
  consultationFee: number;
  location: string;
  about: string;
  education: string[];
  languages: string[];
  telemedicine: boolean;
}

// Sample data for doctors
const staticDoctors = [
  {
    id: 1,
    name: "Dr. Priya Sharma",
    specialty: "Dermatological Surgery",
    subspecialty: "Melanoma",
    hospital: "City Dermatology Institute",
    rating: 4.9,
    reviews: 124,
    experience: 15,
    image: "/placeholder.svg?height=150&width=150",
    availableToday: true,
    nextAvailable: "Today, 2:00 PM",
    consultationFee: 1500,
    location: "Mumbai",
    about:
      "Dr. Sharma is a renowned dermatological surgeon specializing in melanoma and other skin conditions. She has performed over 1000 successful procedures and is known for her patient-centered approach to care.",
    education: [
      "MD in Dermatological Surgery, All India Institute of Medical Sciences",
      "Fellowship in Melanoma Treatment, Memorial Sloan Kettering Medical Center, USA",
    ],
    languages: ["English", "Hindi", "Marathi"],
    telemedicine: true,
  },
  {
    id: 2,
    name: "Dr. Rajiv Mehta",
    specialty: "Clinical Dermatology",
    subspecialty: "Skin Conditions",
    hospital: "Fortis Hospital",
    rating: 4.7,
    reviews: 132,
    experience: 12,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: false,
    nextAvailable: "Tomorrow, 10:30 AM",
    consultationFee: 750,
    location: "Mumbai",
    about: "Dr. Rohan Desai specializes in skin condition diagnosis and treatment. He has extensive experience in dermatosurgery and is known for his expertise in treating complex skin conditions.",
    education: [
      "MBBS - Seth GS Medical College, Mumbai",
      "MD (Dermatology) - KEM Hospital, Mumbai",
      "Diploma in Dermatology - Royal College of Physicians, London"
    ],
    languages: ["English", "Hindi", "Marathi"],
    telemedicine: true,
  },
  {
    id: 3,
    name: "Dr. Shalini Verma",
    specialty: "Dermatology",
    subspecialty: "Dermatopathology",
    hospital: "Max Super Speciality Hospital",
    rating: 4.9,
    reviews: 189,
    experience: 18,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: true,
    nextAvailable: "Today, 4:15 PM",
    consultationFee: 1000,
    location: "Delhi",
    about: "Dr. Shalini Verma is a leading dermatopathologist with expertise in diagnosing complex skin conditions. She combines clinical expertise with advanced diagnostic techniques.",
    education: [
      "MBBS - Maulana Azad Medical College, Delhi",
      "MD (Dermatology) - AIIMS, Delhi",
      "Fellowship in Dermatopathology - Harvard Medical School"
    ],
    languages: ["English", "Hindi", "Punjabi"],
    telemedicine: true,
  },
  {
    id: 4,
    name: "Dr. Ayaan Kapoor",
    specialty: "Dermatology",
    subspecialty: "Mohs Surgery",
    hospital: "Medanta The Medicity",
    rating: 4.8,
    reviews: 145,
    experience: 14,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: false,
    nextAvailable: "Day after tomorrow, 11:00 AM",
    consultationFee: 1200,
    location: "Delhi",
    about: "Dr. Ayaan Kapoor is a specialist in Mohs micrographic surgery and skin condition treatment. He is known for his precision in surgical techniques and excellent patient outcomes.",
    education: [
      "MBBS - AIIMS, Delhi",
      "MD (Dermatology) - AIIMS, Delhi",
      "Fellowship in Mohs Surgery - Mayo Clinic, USA"
    ],
    languages: ["English", "Hindi", "Urdu"],
    telemedicine: true,
  },
  {
    id: 5,
    name: "Dr. Anjali Nair",
    specialty: "Dermatology",
    subspecialty: "Clinical Dermatology",
    hospital: "Manipal Hospital",
    rating: 4.7,
    reviews: 167,
    experience: 10,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: true,
    nextAvailable: "Today, 1:30 PM",
    consultationFee: 700,
    location: "Bangalore",
    about: "Dr. Anjali Nair specializes in general dermatology and cosmetic procedures. She has a special interest in treating skin allergies and hair disorders.",
    education: [
      "MBBS - Bangalore Medical College",
      "MD (Dermatology) - KEM Hospital, Mumbai",
      "Diploma in Clinical Dermatology - British Association of Dermatologists"
    ],
    languages: ["English", "Hindi", "Malayalam"],
    telemedicine: true,
  },
  {
    id: 6,
    name: "Dr. Sunil Menon",
    specialty: "Dermatology",
    subspecialty: "Pediatric Dermatology",
    hospital: "Rainbow Children's Hospital",
    rating: 4.9,
    reviews: 178,
    experience: 16,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: true,
    nextAvailable: "Today, 3:00 PM",
    consultationFee: 900,
    location: "Bangalore",
    about: "Dr. Sunil Menon is a pediatric dermatologist with expertise in treating skin conditions in children. He is known for his gentle approach and effective treatment methods.",
    education: [
      "MBBS - St. John's Medical College, Bangalore",
      "MD (Dermatology) - KEM Hospital, Mumbai",
      "Fellowship in Pediatric Dermatology - Great Ormond Street Hospital, London"
    ],
    languages: ["English", "Hindi", "Malayalam"],
    telemedicine: true,
  },
  {
    id: 7,
    name: "Dr. Ravi Nandakumar",
    specialty: "Dermatology",
    subspecialty: "Skin Surgery",
    hospital: "Narayana Health",
    rating: 4.6,
    reviews: 134,
    experience: 13,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: false,
    nextAvailable: "Tomorrow, 2:30 PM",
    consultationFee: 800,
    location: "Bangalore",
    about: "Dr. Ravi Nandakumar specializes in dermatologic surgery and has extensive experience in treating complex skin conditions. He is known for his surgical precision.",
    education: [
      "MBBS - Bangalore Medical College",
      "MD (Dermatology) - KEM Hospital, Mumbai",
      "Diploma in Dermatology - Royal College of Physicians, London"
    ],
    languages: ["English", "Hindi", "Kannada"],
    telemedicine: true,
  },
  {
    id: 8,
    name: "Dr. Nisha Shetty",
    specialty: "Dermatology",
    subspecialty: "Cosmetic Dermatology",
    hospital: "Sparsh Hospital",
    rating: 4.8,
    reviews: 156,
    experience: 11,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: true,
    nextAvailable: "Today, 5:00 PM",
    consultationFee: 850,
    location: "Bangalore",
    about: "Dr. Nisha Shetty is a cosmetic dermatologist specializing in anti-aging treatments and skin rejuvenation. She is known for her expertise in advanced cosmetic procedures.",
    education: [
      "MBBS - Bangalore Medical College",
      "MD (Dermatology) - KEM Hospital, Mumbai",
      "Fellowship in Cosmetic Dermatology - American Academy of Dermatology"
    ],
    languages: ["English", "Hindi", "Kannada"],
    telemedicine: true,
  },
  {
    id: 9,
    name: "Dr. Arvind Krishnan",
    specialty: "Dermatology",
    subspecialty: "Dermatopathology",
    hospital: "Apollo Hospitals",
    rating: 4.9,
    reviews: 198,
    experience: 20,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: false,
    nextAvailable: "Tomorrow, 11:30 AM",
    consultationFee: 1500,
    location: "Chennai",
    about: "Dr. Arvind Krishnan is a senior dermatopathologist with extensive experience in diagnosing complex skin conditions. He is known for his research work in skin diseases.",
    education: [
      "MBBS - Madras Medical College",
      "MD (Dermatology) - AIIMS, Delhi",
      "Fellowship in Dermatopathology - Harvard Medical School"
    ],
    languages: ["English", "Hindi", "Tamil"],
    telemedicine: true,
  },
  {
    id: 10,
    name: "Dr. Reema Gupta",
    specialty: "Dermatology",
    subspecialty: "Mohs Surgery",
    hospital: "Fortis Hospital",
    rating: 4.8,
    reviews: 167,
    experience: 15,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: true,
    nextAvailable: "Today, 4:00 PM",
    consultationFee: 1200,
    location: "Chennai",
    about: "Dr. Reema Gupta specializes in Mohs micrographic surgery and skin condition treatment. She is known for her expertise in treating complex skin conditions.",
    education: [
      "MBBS - Madras Medical College",
      "MD (Dermatology) - AIIMS, Delhi",
      "Fellowship in Mohs Surgery - Mayo Clinic, USA"
    ],
    languages: ["English", "Hindi", "Punjabi"],
    telemedicine: true,
  },
  {
    id: 11,
    name: "Dr. Karthik Reddy",
    specialty: "Dermatology",
    subspecialty: "Clinical Dermatology",
    hospital: "KIMS Hospital",
    rating: 4.7,
    reviews: 145,
    experience: 12,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: false,
    nextAvailable: "Tomorrow, 10:00 AM",
    consultationFee: 750,
    location: "Hyderabad",
    about: "Dr. Karthik Reddy specializes in general dermatology and has extensive experience in treating skin infections and allergic conditions.",
    education: [
      "MBBS - Osmania Medical College",
      "MD (Dermatology) - KEM Hospital, Mumbai",
      "Diploma in Clinical Dermatology - British Association of Dermatologists"
    ],
    languages: ["English", "Hindi", "Telugu"],
    telemedicine: true,
  },
  {
    id: 12,
    name: "Dr. Sneha Sharma",
    specialty: "Dermatology",
    subspecialty: "Cosmetic Dermatology",
    hospital: "Yashoda Hospitals",
    rating: 4.8,
    reviews: 178,
    experience: 14,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: true,
    nextAvailable: "Today, 3:30 PM",
    consultationFee: 900,
    location: "Hyderabad",
    about: "Dr. Sneha Sharma is a cosmetic dermatologist specializing in anti-aging treatments and skin rejuvenation. She is known for her expertise in advanced cosmetic procedures.",
    education: [
      "MBBS - Osmania Medical College",
      "MD (Dermatology) - KEM Hospital, Mumbai",
      "Fellowship in Cosmetic Dermatology - American Academy of Dermatology"
    ],
    languages: ["English", "Hindi", "Marathi"],
    telemedicine: true,
  },
  {
    id: 13,
    name: "Dr. Priya Mehta",
    specialty: "Dermatology",
    subspecialty: "Pediatric Dermatology",
    hospital: "Apollo Hospitals",
    rating: 4.9,
    reviews: 189,
    experience: 16,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: false,
    nextAvailable: "Tomorrow, 2:00 PM",
    consultationFee: 850,
    location: "Ahmedabad",
    about: "Dr. Priya Mehta is a pediatric dermatologist with expertise in treating skin conditions in children. She is known for her gentle approach and effective treatment methods.",
    education: [
      "MBBS - BJ Medical College",
      "MD (Dermatology) - KEM Hospital, Mumbai",
      "Fellowship in Pediatric Dermatology - Great Ormond Street Hospital, London"
    ],
    languages: ["English", "Hindi", "Gujarati"],
    telemedicine: true,
  },
  {
    id: 14,
    name: "Dr. Rajiv Bhatia",
    specialty: "Dermatology",
    subspecialty: "Dermatopathology",
    hospital: "Civil Hospital",
    rating: 4.7,
    reviews: 156,
    experience: 19,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
    availableToday: true,
    nextAvailable: "Today, 5:30 PM",
    consultationFee: 1100,
    location: "Ahmedabad",
    about: "Dr. Rajiv Bhatia is a senior dermatopathologist with extensive experience in diagnosing complex skin conditions. He is known for his research work in skin diseases.",
    education: [
      "MBBS - BJ Medical College",
      "MD (Dermatology) - AIIMS, Delhi",
      "Fellowship in Dermatopathology - Harvard Medical School"
    ],
    languages: ["English", "Hindi", "Punjabi"],
    telemedicine: true,
  }
]

// Generate time slots
const generateTimeSlots = (date: Date) => {
  const slots = []
  const startHour = 9 // 9 AM
  const endHour = 17 // 5 PM

  for (let hour = startHour; hour <= endHour; hour++) {
    for (const minute of [0, 30]) {
      const slotTime = new Date(date)
      slotTime.setHours(hour, minute, 0, 0)

      // Skip times in the past for today
      if (date.toDateString() === new Date().toDateString() && slotTime < new Date()) {
        continue
      }

      slots.push({
        time: slotTime,
        available: Math.random() > 0.3, // Randomly mark some as unavailable
      })
    }
  }

  return slots
}

// Generate dates for the next 7 days
const generateDates = () => {
  const dates = []
  const today = new Date()

  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i)
    dates.push({
      date,
      slots: generateTimeSlots(date),
    })
  }

  return dates
}

// Generate a unique appointment ID
const generateAppointmentId = () => {
  return "APPT-" + Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Add this component for the info modal
const DoctorInfoModal = ({ doctor, isOpen, onClose, onSelectDoctor }: { doctor: Doctor; isOpen: boolean; onClose: () => void; onSelectDoctor: (doctor: Doctor) => void }) => {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image
              src={doctor.image || "/placeholder.svg?height=150&width=150"}
              alt={doctor.name}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h3 className="text-xl font-bold">{doctor.name}</h3>
              <p className="text-sm text-muted-foreground">
                {doctor.specialty} • {doctor.subspecialty}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{doctor.rating}</span>
            <span className="text-sm text-muted-foreground">({doctor.reviews} reviews)</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Experience</h4>
              <p>{doctor.experience} years</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Languages</h4>
              <p>{doctor.languages.join(", ")}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">About</h4>
            <p className="text-sm text-muted-foreground">{doctor.about}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Education</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {doctor.education.map((edu, index) => (
                <li key={index}>{edu}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Hospital</h4>
            <p className="text-sm text-muted-foreground">{doctor.hospital}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Location</h4>
            <p className="text-sm text-muted-foreground">{doctor.location}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Consultation Fee</h4>
            <p className="text-lg font-bold">₹{doctor.consultationFee}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => {
            onClose();
            onSelectDoctor(doctor);
          }}>
            Book Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function AppointmentsPage() {
  const [allDoctors, setAllDoctors] = useState<Doctor[]>(staticDoctors)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [priceRange, setPriceRange] = useState([0, 1500])
  const [onlyTelemedicine, setOnlyTelemedicine] = useState(false)
  const [availableToday, setAvailableToday] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null)
  const [consultationType, setConsultationType] = useState("in-person")
  const [showBookingSuccess, setShowBookingSuccess] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [appointmentId, setAppointmentId] = useState("")
  const [selectedDoctorInfo, setSelectedDoctorInfo] = useState<Doctor | null>(null)
  const [appointmentSaved, setAppointmentSaved] = useState(false)

  // Add medical history context
  const { addHistory } = useMedicalHistory()

  // Pull live profile data for patient info auto-fill
  const { profile } = useProfile()
  const patientName = profile?.fullName || "Patient"
  const patientEmail = profile?.email || ""
  const patientPhone = profile?.contactNumber || ""
  const [patientSymptoms, setPatientSymptoms] = useState("")

  // Fetch live doctors from API
  useEffect(() => {
    const fetchLiveDoctors = async () => {
      try {
        const res = await fetch('/api/doctors')
        if (res.ok) {
           const liveDocs = await res.json()
           // Append live docs to standard mock list
           setAllDoctors([...liveDocs, ...staticDoctors])
        }
      } catch (err) {
        console.error("Failed to fetch live doctors", err)
      }
    }
    fetchLiveDoctors()
  }, [])

  // Generate available dates and time slots
  const availableDates = generateDates()

  // Filter doctors based on search and filters
  const filteredDoctors = allDoctors.filter((doctor) => {
    // Search query filter
    const matchesSearch =
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.subspecialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.hospital.toLowerCase().includes(searchQuery.toLowerCase())

    // Specialty filter
    const matchesSpecialty = selectedSpecialty === "all" || doctor.specialty === selectedSpecialty

    // Location filter
    const matchesLocation = selectedLocation === "all" || doctor.location === selectedLocation

    // Price range filter
    const matchesPrice = doctor.consultationFee >= priceRange[0] && doctor.consultationFee <= priceRange[1]

    // Telemedicine filter
    const matchesTelemedicine = !onlyTelemedicine || doctor.telemedicine

    // Available today filter
    const matchesAvailability = !availableToday || doctor.availableToday

    return (
      matchesSearch && matchesSpecialty && matchesLocation && matchesPrice && matchesTelemedicine && matchesAvailability
    )
  })

  const handleBookAppointment = () => {
    if (!selectedTimeSlot) {
      toast.error("Error", {
        description: "Please select a time slot for your appointment.",
      })
      return
    }

    // Generate a unique appointment ID
    const newAppointmentId = generateAppointmentId()
    setAppointmentId(newAppointmentId)

    const meetLink = consultationType === "telemedicine" ? `https://teams.live.com/meet/${Math.random().toString(36).substring(7)}` : null

    // Call Mock API to send confirmation emails/save to backend
    if (selectedDoctor) {
      fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          patientName: patientName,
          symptoms: patientSymptoms,
          date: selectedTimeSlot.toISOString(),
          type: consultationType,
          telemedicineLink: meetLink
        })
      }).catch(e => console.warn(e))
    }

    // Simulate booking process
    setTimeout(() => {
      setShowBookingSuccess(true)
      
      // Save appointment to medical history (Postgres synced)
      if (selectedDoctor && selectedTimeSlot && !appointmentSaved) {
        // Save to context
        addHistory({
          type: "Appointment",
          data: `Consultation — ${selectedDoctor.name}`,
          details: {
            Appointment_ID: newAppointmentId,
            Doctor_Name: selectedDoctor.name,
            Specialty: `${selectedDoctor.specialty} (${selectedDoctor.subspecialty})`,
            Date: format(selectedTimeSlot, "MMMM d, yyyy"),
            Time: format(selectedTimeSlot, "h:mm a"),
            Type: consultationType === "telemedicine" ? "Telemedicine" : "In-Person Clinic",
            Location: consultationType === "telemedicine" ? "Microsoft Teams" : selectedDoctor.hospital,
            Join_Link: meetLink || undefined,
            Symptoms: patientSymptoms || "None specified",
            Fee: `₹${selectedDoctor.consultationFee}`
          }
        });
        
        setAppointmentSaved(true)
      }
      
    }, 1000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // In a real app, you would upload these files to a server
      // For this demo, we'll just store the file names
      const newFiles = Array.from(e.target.files).map((file) => file.name)
      setUploadedFiles([...uploadedFiles, ...newFiles])

      toast.success("Files uploaded", {
        description: `Successfully uploaded ${newFiles.length} file(s).`,
      })
    }
  }

  const generateAppointmentPDF = () => {
    if (!selectedDoctor || !selectedTimeSlot) return

    const doc = new jsPDF()

    // Add header
    doc.setFontSize(20)
    doc.setTextColor(0, 102, 204)
    doc.text("Carcino AI", 105, 20, { align: "center" })

    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text("Appointment Confirmation", 105, 30, { align: "center" })

    // Add appointment details
    doc.setFontSize(12)
    doc.text(`Appointment ID: ${appointmentId}`, 20, 45)
    doc.text(`Date: ${format(selectedTimeSlot, "EEEE, MMMM d, yyyy")}`, 20, 55)
    doc.text(`Time: ${format(selectedTimeSlot, "h:mm a")}`, 20, 65)
    doc.text(`Type: ${consultationType === "telemedicine" ? "Telemedicine" : "In-Person"}`, 20, 75)

    // Add doctor details
    doc.setFontSize(14)
    doc.text("Doctor Details", 20, 90)
    doc.setFontSize(12)
    doc.text(`Name: ${selectedDoctor.name}`, 20, 100)
    doc.text(`Specialty: ${selectedDoctor.specialty} (${selectedDoctor.subspecialty})`, 20, 110)
    doc.text(`Hospital: ${selectedDoctor.hospital}`, 20, 120)
    doc.text(`Location: ${selectedDoctor.location}`, 20, 130)

    // Add patient details
    doc.setFontSize(14)
    doc.text("Patient Details", 20, 150)
    doc.setFontSize(12)
    doc.text(`Name: ${patientName}`, 20, 160)
    doc.text(`Email: ${patientEmail}`, 20, 170)
    doc.text(`Phone: ${patientPhone}`, 20, 180)

    // Add payment details
    doc.setFontSize(14)
    doc.text("Payment Details", 20, 200)
    doc.setFontSize(12)
    doc.text(`Consultation Fee: ₹${selectedDoctor.consultationFee}`, 20, 210)

    if (consultationType === "telemedicine") {
      doc.text(`Platform Fee: ₹100`, 20, 220)
      doc.text(`Total Amount: ₹${selectedDoctor.consultationFee + 100}`, 20, 230)
    } else {
      doc.text(`Total Amount: ₹${selectedDoctor.consultationFee}`, 20, 220)
    }

    // Add instructions
    doc.setFontSize(14)
    doc.text("Instructions", 20, 245)
    doc.setFontSize(10)

    if (patientSymptoms) {
      doc.text(`Reported Symptoms: ${patientSymptoms.substring(0, 100)}${patientSymptoms.length > 100 ? '...' : ''}`, 20, 190)
    }

    if (consultationType === "telemedicine") {
      doc.text("1. You will receive a link to join the video consultation 15 minutes before the appointment.", 20, 255)
      doc.text("2. Ensure you have a stable internet connection and a quiet environment.", 20, 265)
      doc.text("3.  Ensure you have a stable internet connection and a quiet environment.", 20, 265)
      doc.text("3. Keep your medical records and any questions ready for the consultation.", 20, 275)
    } else {
      doc.text("1. Please arrive 15 minutes before your appointment time.", 20, 255)
      doc.text("2. Bring your ID proof and any relevant medical records.", 20, 265)
      doc.text(`3. Hospital Address: ${selectedDoctor.hospital}, ${selectedDoctor.location}`, 20, 275)
    }

    // Add footer
    doc.setFontSize(10)
    doc.text("For any queries, please contact support@dermaai.com", 105, 290, { align: "center" })

    // Save the PDF
    doc.save(`Appointment_${appointmentId}.pdf`)

    toast.info("PDF Generated", {
      description: "Appointment details have been downloaded as a PDF.",
    })
  }

  const addToGoogleCalendar = () => {
    if (!selectedDoctor || !selectedTimeSlot) return

    // Format the date for Google Calendar
    const startTime = selectedTimeSlot.toISOString().replace(/-|:|\.\d+/g, "")
    const endTime = new Date(selectedTimeSlot.getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d+/g, "")

    // Create the event details
    const eventDetails = {
      action: "TEMPLATE",
      text: `Appointment with ${selectedDoctor.name}`,
      dates: `${startTime}/${endTime}`,
      details: `
        Appointment ID: ${appointmentId}
        Doctor: ${selectedDoctor.name}
        Specialty: ${selectedDoctor.specialty} (${selectedDoctor.subspecialty})
        Type: ${consultationType === "telemedicine" ? "Telemedicine" : "In-Person"}
        ${
          consultationType === "telemedicine"
            ? "You will receive a link to join the video consultation 15 minutes before the appointment."
            : `Location: ${selectedDoctor.hospital}, ${selectedDoctor.location}`
        }
      `,
      location:
        consultationType === "telemedicine"
          ? "Online Video Consultation"
          : `${selectedDoctor.hospital}, ${selectedDoctor.location}`,
    }

    // Construct the Google Calendar URL
    const googleCalendarUrl = `https://www.google.com/calendar/render?${Object.entries(eventDetails)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")}`

    // Open the Google Calendar in a new tab
    window.open(googleCalendarUrl, "_blank")

    // Fix the toast notification format to use sonner's format
    toast.success("Added to Calendar", {
      description: "Appointment has been added to your Google Calendar."
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dermatologist Appointments</h2>
          <p className="text-muted-foreground">Find and schedule consultations with specialized dermatologists</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Reminders
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            My Appointments
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors, specialties, or hospitals..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {/* <SelectItem value="Surgical Oncology">Surgical Oncology</SelectItem>
                  <SelectItem value="Medical Oncology">Medical Oncology</SelectItem>
                  <SelectItem value="Dermatologic Oncology">Dermatologic Oncology</SelectItem>
                  <SelectItem value="Radiation Oncology">Radiation Oncology</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Mumbai">Mumbai</SelectItem>
                  <SelectItem value="Delhi">Delhi</SelectItem>
                  <SelectItem value="Bangalore">Bangalore</SelectItem>
                  <SelectItem value="Chennai">Chennai</SelectItem>
                  <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-2 block">Price Range (₹)</Label>
              <Slider value={priceRange} min={0} max={1500} step={50} onValueChange={setPriceRange} className="py-4" />
              <div className="flex items-center justify-between text-sm">
                <span>₹{priceRange[0]}</span>
                <span>₹{priceRange[1]}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch id="telemedicine" checked={onlyTelemedicine} onCheckedChange={setOnlyTelemedicine} />
                <Label htmlFor="telemedicine">Telemedicine Only</Label>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch id="available-today" checked={availableToday} onCheckedChange={setAvailableToday} />
                <Label htmlFor="available-today">Available Today</Label>
              </div>

              <Button variant="outline" size="sm" className="ml-auto">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doctor Listing */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {filteredDoctors.length} {filteredDoctors.length === 1 ? "Doctor" : "Doctors"} Found
          </h3>
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No doctors found</h3>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
                <CardContent className="p-0 flex-1 flex flex-col">
                  {/* Doctor Image */}
                  <div className="relative bg-gradient-to-br from-emerald-50 to-blue-50 p-6 flex items-center justify-center">
                    <div className="relative">
                      <Image
                        src={doctor.image || "/placeholder.svg?height=150&width=150"}
                        alt={doctor.name}
                        width={128}
                        height={128}
                        className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      {doctor.availableToday && (
                        <div className="absolute bottom-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-full border-2 border-white shadow-sm">
                          Available
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDoctorInfo(doctor)}
                      className="absolute top-2 right-2 h-8 w-8 bg-white/80 hover:bg-white"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Doctor Info */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{doctor.name}</h3>
                      <p className="text-sm text-emerald-600 font-semibold">
                        {doctor.specialty}
                      </p>
                      <p className="text-xs text-gray-600">{doctor.subspecialty}</p>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="ml-1 font-semibold text-sm">{doctor.rating}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">({doctor.reviews} reviews)</span>
                      </div>

                      {/* Hospital & Location */}
                      <div className="space-y-1 pt-2">
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          {doctor.hospital}
                        </p>
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {doctor.location}
                        </p>
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {doctor.experience}+ yrs
                        </Badge>
                        {doctor.telemedicine && (
                          <Badge variant="outline" className="text-xs border-purple-200 text-purple-700">
                            <Video className="h-3 w-3 mr-1" />
                            Video
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Next Available & Fee */}
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Next Available</p>
                          <p className="text-xs font-semibold text-emerald-600">
                            {doctor.nextAvailable}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Fee</p>
                          <p className="text-sm font-bold text-gray-900">₹{doctor.consultationFee}</p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => setSelectedDoctor(doctor)} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        size="sm"
                      >
                        Book Appointment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Appointment Booking Section - Floating */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDoctor(null)}>
          <div className="bg-background rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-lg">Book Appointment</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDoctor(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Image
                      src={selectedDoctor.image || "/placeholder.svg?height=150&width=150"}
                      alt={selectedDoctor.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-bold">{selectedDoctor.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDoctor.specialty} • {selectedDoctor.subspecialty}
                      </p>
                      <div className="flex items-center mt-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 text-sm">
                          {selectedDoctor.rating} ({selectedDoctor.reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Consultation Type</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="in-person"
                          name="consultation-type"
                          value="in-person"
                          checked={consultationType === "in-person"}
                          onChange={() => setConsultationType("in-person")}
                          className="h-4 w-4"
                          aria-labelledby="in-person-label"
                          title="In-Person Consultation"
                        />
                        <Label htmlFor="in-person" id="in-person-label" className="text-sm font-normal">
                          In-Person
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="telemedicine"
                          name="consultation-type"
                          value="telemedicine"
                          checked={consultationType === "telemedicine"}
                          onChange={() => setConsultationType("telemedicine")}
                          className="h-4 w-4"
                          disabled={!selectedDoctor.telemedicine}
                          aria-labelledby="telemedicine-label"
                          title="Telemedicine Consultation"
                        />
                        <Label
                          htmlFor="telemedicine"
                          id="telemedicine-label"
                          className={`text-sm font-normal ${!selectedDoctor.telemedicine ? "text-muted-foreground" : ""}`}
                        >
                          Telemedicine
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {availableDates.slice(0, 4).map((dateObj, index) => (
                        <Button
                          key={index}
                          variant={selectedDate?.toDateString() === dateObj.date.toDateString() ? "default" : "outline"}
                          className="flex flex-col h-auto py-2"
                          onClick={() => setSelectedDate(dateObj.date)}
                        >
                          <span className="text-xs">{format(dateObj.date, "EEE")}</span>
                          <span className="text-lg font-bold">{format(dateObj.date, "d")}</span>
                          <span className="text-xs">{format(dateObj.date, "MMM")}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Time</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedDate &&
                        availableDates
                          .find((d) => d.date.toDateString() === selectedDate.toDateString())
                          ?.slots.slice(0, 8)
                          .map((slot, index) => (
                            <Button
                              key={index}
                              variant={selectedTimeSlot?.getTime() === slot.time.getTime() ? "default" : "outline"}
                              disabled={!slot.available}
                              className={cn("text-sm", !slot.available && "opacity-50 cursor-not-allowed")}
                              onClick={() => setSelectedTimeSlot(slot.time)}
                            >
                              {format(slot.time, "h:mm a")}
                            </Button>
                          ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason for Appointment (Symptoms)</Label>
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Briefly describe your symptoms or concern..."
                      value={patientSymptoms}
                      onChange={(e) => setPatientSymptoms(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Upload Medical Records (Optional)</Label>
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="dropzone-file"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-1 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">PDF, JPG, PNG (MAX. 10MB)</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" multiple onChange={handleFileUpload} />
                      </label>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Uploaded Files:</p>
                        <ul className="text-sm text-muted-foreground">
                          {uploadedFiles.map((file, index) => (
                            <li key={index} className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              {file}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex justify-between">
                      <span>Consultation Fee</span>
                      <span>₹{selectedDoctor.consultationFee}</span>
                    </div>
                    {consultationType === "telemedicine" && (
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>Platform Fee</span>
                        <span>₹100</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                      <span>Total</span>
                      <span>₹{selectedDoctor.consultationFee + (consultationType === "telemedicine" ? 100 : 0)}</span>
                    </div>
                  </div>
              <div className="sticky bottom-0 bg-background border-t p-4 space-y-2">
                <Button className="w-full" onClick={handleBookAppointment}>
                  Confirm Appointment
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setSelectedDoctor(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Success Dialog - Improved layout with better containment and alignment */}
      <Dialog open={showBookingSuccess} onOpenChange={setShowBookingSuccess}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Appointment Confirmed!</DialogTitle>
            <DialogDescription>
              Your appointment is booked successfully. The doctor will send you an email shortly regarding the confirmation and all details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative">
            {/* Close button at top-right */}
            <button 
              onClick={() => setShowBookingSuccess(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            
            {selectedDoctor && selectedTimeSlot && (
              <div className="px-6 space-y-4">
                {/* Doctor info card with controlled dimensions */}
                <div className="rounded-lg bg-muted p-4 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-background">
                    <Image
                      src={selectedDoctor.image || "/placeholder.svg?height=150&width=150"}
                      alt={selectedDoctor.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base">{selectedDoctor.name}</h3>
                    <p className="text-sm text-muted-foreground">Dermatology</p>
                  </div>
                </div>

                {/* Appointment details with fixed width icons for alignment */}
                <div className="space-y-3 py-1">
                  <div className="flex items-center">
                    <div className="w-6 flex-shrink-0">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm">{format(selectedTimeSlot, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 flex-shrink-0">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm">{format(selectedTimeSlot, "h:mm a")}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 flex-shrink-0">
                      {consultationType === "telemedicine" ? (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm truncate">
                      {consultationType === "telemedicine" 
                        ? "Online Video Consultation" 
                        : `${selectedDoctor.hospital}, ${selectedDoctor.location}`}
                    </span>
                  </div>
                </div>

                {/* Info box with controlled width */}
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                  <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {consultationType === "telemedicine" ? "Please join via the Meeting Link at the time of appointment. Keep your medical records ready." : "Please arrive 15 minutes before your appointment time. Don't forget to bring your medical records and ID proof."}
                  </p>
                </div>

                {/* Appointment ID with controlled spacing */}
                <div className="mt-2">
                  <p className="text-sm font-semibold">Appointment ID: <span className="font-mono select-all">{appointmentId}</span></p>
                  <p className="text-xs text-muted-foreground">Please save this ID for future reference</p>
                </div>

                {/* Confirmation message for saved appointment */}
                {appointmentSaved && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-300">
                      ✔ Saved to medical history
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer with fixed height and spacing */}
            <div className="border-t mt-4 p-4 flex flex-row gap-2 justify-end bg-muted/50">
              <Button variant="outline" size="sm" onClick={() => setShowBookingSuccess(false)}>
                Close
              </Button>
              <Button variant="outline" size="sm" onClick={generateAppointmentPDF}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download PDF
              </Button>
              <Button size="sm" onClick={addToGoogleCalendar}>
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                Add to Calendar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doctor Info Modal */}
      {selectedDoctorInfo && (
        <DoctorInfoModal
          doctor={selectedDoctorInfo}
          isOpen={!!selectedDoctorInfo}
          onClose={() => setSelectedDoctorInfo(null)}
          onSelectDoctor={setSelectedDoctor}
        />
      )}
    </div>
  )
}