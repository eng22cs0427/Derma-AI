import { ObjectId } from 'mongodb'

export interface IProfile {
  _id?: ObjectId
  clerkUserId: string
  email: string
  fullName?: string
  avatarUrl?: string
  dateOfBirth?: string
  gender?: string
  contactNumber?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  bio?: string
  role: 'patient' | 'doctor' | 'admin'
  isActive: boolean
  isOnboarded: boolean
  medicalInfo?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ISkinAnalysis {
  _id?: ObjectId
  userId: ObjectId
  imageUrl: string
  imageKey: string
  predictionClass: string
  predictionName?: string
  confidenceScore: number
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High'
  severityStage?: 1 | 2 | 3
  severityLabel?: string
  allPredictions?: Record<string, number>
  heatmapUrl?: string
  pdfReportUrl?: string
  notes?: string
  doctorReviewed: boolean
  doctorNotes?: string
  reviewedBy?: ObjectId
  reviewedAt?: Date
  followUpRequired: boolean
  followUpDate?: string
  azureQualityScore?: number
  preprocessingApplied?: string[]
  createdAt: Date
}

export interface IMedicalHistory {
  _id?: ObjectId
  userId: ObjectId
  type: 'Appointment' | 'Medicine' | 'Analysis' | 'Treatment' | 'Lab Test' | 'Prescription'
  data: string
  details?: Record<string, unknown>
  severity?: 'Low' | 'Medium' | 'High' | 'Critical'
  status?: 'Active' | 'Completed' | 'Cancelled' | 'Pending'
  date: Date
  createdAt: Date
  updatedAt: Date
}

export interface IAppointment {
  _id?: ObjectId
  patientId: ObjectId
  doctorId?: ObjectId | null
  doctorName: string
  specialty?: string
  appointmentDate: string
  appointmentTime: string
  durationMinutes?: number
  appointmentType?: 'Video Call' | 'In-Person' | 'Phone Call'
  status: 'Scheduled' | 'Confirmed' | 'Cancelled' | 'Completed' | 'No Show'
  reason?: string
  notes?: string
  meetingLink?: string
  prescriptionUrl?: string
  billAmount?: number
  paymentStatus?: 'Pending' | 'Paid' | 'Failed' | 'Refunded'
  paymentId?: string
  fee?: number
  type?: string
  createdAt: Date
  updatedAt: Date
}

export interface IOrder {
  _id?: ObjectId
  orderNumber: string
  userId: ObjectId
  items: Record<string, unknown>[]
  subtotal: number
  tax: number
  shippingCost: number
  totalAmount: number
  currency?: string
  paymentMethod?: string
  paymentStatus?: string
  paymentId?: string
  orderStatus: string
  deliveryAddress: Record<string, unknown>
  trackingNumber?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface IMedication {
  _id?: ObjectId
  userId: ObjectId
  medicationName: string
  dosage: string
  frequency: string
  route?: string
  startDate: Date
  endDate?: Date
  isActive: boolean
  prescribedBy?: string
  prescriptionUrl?: string
  instructions?: string
  notes?: string
  reminderEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IAuditLog {
  _id?: ObjectId
  userId?: ObjectId
  action: string
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface IUserSettings {
  _id?: ObjectId
  userId: ObjectId
  theme?: 'light' | 'dark' | 'system'
  language?: string
  notificationsEnabled?: boolean
  emailNotifications?: boolean
  measurementUnit?: 'metric' | 'imperial'
  timezone?: string
  twoFactorEnabled?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IDoctorNotification {
  _id?: ObjectId
  doctorId: ObjectId
  patientId?: ObjectId
  title: string
  message: string
  type: 'Appointment' | 'Analysis' | 'General'
  link?: string
  read: boolean
  createdAt: Date
}
