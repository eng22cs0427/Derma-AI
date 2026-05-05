/**
 * Brevo (formerly Sendinblue) Email Service
 * Replaces: AWS SES SMTP
 * Free: 300 emails/day, NO custom domain required
 * Setup: Create account at brevo.com → SMTP & API → Generate SMTP Key
 *
 * All 5 exported functions have IDENTICAL signatures — zero breaking changes.
 */

import nodemailer from 'nodemailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || process.env.SES_FROM_EMAIL || 'noreplydermaai@gmail.com'

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER || '',
      pass: process.env.BREVO_SMTP_KEY || '',
    },
  })
}

async function sendEmail({
  to,
  subject,
  htmlBody,
  textBody,
}: {
  to: string
  subject: string
  htmlBody: string
  textBody: string
}) {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
    console.log(`[Email skipped — ENABLE_EMAIL_NOTIFICATIONS=false] To: ${to}`)
    return
  }

  if (!process.env.BREVO_SMTP_KEY && !process.env.BREVO_SMTP_USER) {
    console.warn('[Email skipped — BREVO_SMTP_KEY not configured. Set up at brevo.com]')
    return
  }

  const transporter = createTransporter()
  try {
    const info = await transporter.sendMail({
      from: `"DermaSense AI" <${FROM_EMAIL}>`,
      replyTo: FROM_EMAIL,
      to,
      subject,
      html: htmlBody,
      text: textBody,
    })
    console.log(`[Email sent via Brevo] To: ${to} | MessageId: ${info.messageId}`)
  } catch (error) {
    console.error('[Email send failed via Brevo]', error)
  }
}

export async function sendWelcomeEmail({ to, fullName }: { to: string; fullName: string }) {
  await sendEmail({
    to,
    subject: '👋 Welcome to DermaSense AI!',
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#1d4ed8;font-size:28px;margin:0;">DermaSense AI</h1>
          <p style="color:#6b7280;margin:4px 0 0;">Your AI-Powered Skin Health Platform</p>
        </div>
        <div style="background:white;border-radius:8px;padding:24px;">
          <h2 style="color:#111827;">Welcome, ${fullName}! 🎉</h2>
          <p style="color:#374151;line-height:1.6;">Your account has been created. You can now:</p>
          <ul style="color:#374151;line-height:2;">
            <li>🔬 Upload skin images for AI analysis</li>
            <li>📅 Book appointments with dermatologists</li>
            <li>📋 Track your complete medical history</li>
            <li>📄 Download professional PDF medical reports</li>
            <li>🛒 Access our medical shop</li>
          </ul>
          <div style="text-align:center;margin-top:24px;">
            <a href="${APP_URL}/dashboard" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Go to Dashboard →</a>
          </div>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">DermaSense AI • If you didn't create this account, ignore this email.</p>
      </div>`,
    textBody: `Welcome to DermaSense AI, ${fullName}!\n\nYour account is ready. Log in at: ${APP_URL}/dashboard`,
  })
}

export async function sendAppointmentConfirmationEmail({
  to, patientName, doctorName, specialty, date, time, consultationType, totalFee,
}: {
  to: string; patientName: string; doctorName: string; specialty: string
  date: string; time: string; consultationType: string; totalFee: number
}) {
  await sendEmail({
    to,
    subject: `✅ Appointment Confirmed — Dr. ${doctorName} on ${date}`,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <h1 style="color:#1d4ed8;text-align:center;">DermaSense AI</h1>
        <div style="background:white;border-radius:8px;padding:24px;">
          <div style="background:#dcfce7;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
            <p style="color:#166534;font-weight:bold;margin:0;">✅ Appointment confirmed!</p>
          </div>
          <h2 style="color:#111827;margin-top:0;">Hello, ${patientName}</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Doctor</td><td style="color:#111827;font-weight:bold;">Dr. ${doctorName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Specialty</td><td style="color:#111827;">${specialty}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="color:#111827;">${date}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="color:#111827;">${time}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Type</td><td style="color:#111827;">${consultationType}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Total Fee</td><td style="color:#111827;font-weight:bold;">₹${totalFee}</td></tr>
          </table>
          <div style="text-align:center;margin-top:24px;">
            <a href="${APP_URL}/dashboard/appointments" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">View Appointment →</a>
          </div>
        </div>
      </div>`,
    textBody: `Appointment Confirmed!\nDoctor: Dr. ${doctorName} (${specialty})\nDate: ${date} at ${time}\nType: ${consultationType}\nFee: ₹${totalFee}\n\nView: ${APP_URL}/dashboard/appointments`,
  })
}

export async function sendAnalysisResultEmail({
  to, patientName, riskLevel, predictionClass, confidence,
}: {
  to: string; patientName: string; riskLevel: string; predictionClass: string; confidence: number
}) {
  const isHighRisk = ['High', 'Very High'].includes(riskLevel)
  await sendEmail({
    to,
    subject: isHighRisk ? `⚠️ Skin Analysis — ${riskLevel} Risk Detected` : `✅ Skin Analysis Complete — ${riskLevel} Risk`,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <h1 style="color:#1d4ed8;text-align:center;">DermaSense AI</h1>
        <div style="background:white;border-radius:8px;padding:24px;">
          <h2>Hi ${patientName},</h2>
          <p>Your skin analysis is complete:</p>
          <div style="background:${isHighRisk ? '#fef2f2' : '#f0fdf4'};border-left:4px solid ${isHighRisk ? '#ef4444' : '#22c55e'};padding:12px 16px;border-radius:4px;">
            <p style="color:${isHighRisk ? '#991b1b' : '#166534'};font-weight:bold;margin:0;font-size:16px;">Risk Level: ${riskLevel}</p>
          </div>
          <table style="width:100%;margin-top:16px;">
            <tr><td style="color:#6b7280;padding:8px 0;">Condition</td><td style="font-weight:bold;">${predictionClass}</td></tr>
            <tr><td style="color:#6b7280;padding:8px 0;">Confidence</td><td>${confidence.toFixed(1)}%</td></tr>
          </table>
          ${isHighRisk ? '<div style="background:#fff7ed;border-radius:8px;padding:12px;margin-top:16px;"><p style="color:#92400e;margin:0;">⚕️ <strong>Please consult a dermatologist soon.</strong></p></div>' : ''}
          <div style="text-align:center;margin-top:24px;">
            <a href="${APP_URL}/dashboard/analysis" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">View Full Report →</a>
          </div>
        </div>
      </div>`,
    textBody: `Analysis Result\nRisk: ${riskLevel}\nCondition: ${predictionClass}\nConfidence: ${confidence.toFixed(1)}%\n\nView: ${APP_URL}/dashboard/analysis`,
  })
}

export async function sendDoctorReviewEmail({
  to, patientName, doctorName, doctorNotes, followUpRequired, followUpDate,
}: {
  to: string; patientName: string; doctorName: string; doctorNotes: string
  followUpRequired: boolean; followUpDate?: string
}) {
  await sendEmail({
    to,
    subject: `👨‍⚕️ Dr. ${doctorName} reviewed your skin analysis`,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <h1 style="color:#1d4ed8;text-align:center;">DermaSense AI</h1>
        <div style="background:white;border-radius:8px;padding:24px;">
          <h2>Hi ${patientName},</h2>
          <p><strong>Dr. ${doctorName}</strong> has reviewed your analysis:</p>
          <div style="background:#f8fafc;border-left:4px solid #1d4ed8;padding:16px;margin:16px 0;border-radius:4px;">
            <p style="color:#1e293b;margin:0;font-style:italic;">"${doctorNotes}"</p>
          </div>
          ${followUpRequired && followUpDate ? `<div style="background:#fef9c3;border-radius:8px;padding:12px;"><p style="color:#713f12;margin:0;">📅 Follow-up needed on <strong>${followUpDate}</strong></p></div>` : ''}
          <div style="text-align:center;margin-top:24px;">
            <a href="${APP_URL}/dashboard/analysis" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">View Analysis →</a>
          </div>
        </div>
      </div>`,
    textBody: `Dr. ${doctorName} reviewed your analysis.\nNotes: "${doctorNotes}"${followUpRequired ? `\nFollow-up: ${followUpDate}` : ''}\n\nView: ${APP_URL}/dashboard/analysis`,
  })
}

export async function sendAppointmentStatusEmail({
  to, patientName, doctorName, date, time, newStatus, reason,
}: {
  to: string; patientName: string; doctorName: string; date: string
  time: string; newStatus: 'Confirmed' | 'Cancelled' | 'Completed'; reason?: string
}) {
  const cfg = {
    Confirmed: { emoji: '✅', color: '#166534', bg: '#dcfce7' },
    Cancelled: { emoji: '❌', color: '#991b1b', bg: '#fef2f2' },
    Completed: { emoji: '🎉', color: '#1e40af', bg: '#dbeafe' },
  }[newStatus]

  await sendEmail({
    to,
    subject: `${cfg.emoji} Appointment ${newStatus} — Dr. ${doctorName}`,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <h1 style="color:#1d4ed8;text-align:center;">DermaSense AI</h1>
        <div style="background:white;border-radius:8px;padding:24px;">
          <div style="background:${cfg.bg};border-radius:8px;padding:12px 16px;margin-bottom:20px;">
            <p style="color:${cfg.color};font-weight:bold;margin:0;">${cfg.emoji} Appointment ${newStatus.toLowerCase()}</p>
          </div>
          <p>Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been <strong>${newStatus.toLowerCase()}</strong>.</p>
          ${reason ? `<p style="color:#6b7280;">Reason: ${reason}</p>` : ''}
          <div style="text-align:center;margin-top:24px;">
            <a href="${APP_URL}/dashboard/appointments" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">View Appointments →</a>
          </div>
        </div>
      </div>`,
    textBody: `Appointment ${newStatus}: Dr. ${doctorName} on ${date} at ${time}${reason ? `\nReason: ${reason}` : ''}\n\nView: ${APP_URL}/dashboard/appointments`,
  })
}

// Sent immediately when doctor clicks "Confirm" in their dashboard
export async function sendDoctorConfirmedAppointmentEmail({
  to, patientName, doctorName, specialty, hospitalName, hospitalAddress,
  date, time, meetingLink, fee, doctorPhone, licenseNumber,
}: {
  to: string
  patientName: string
  doctorName: string
  specialty: string
  hospitalName: string
  hospitalAddress: string
  date: string
  time: string
  meetingLink: string
  fee: number
  doctorPhone: string
  licenseNumber: string
}) {
  const isVideo = !!meetingLink

  await sendEmail({
    to,
    subject: `✅ Appointment Confirmed — Dr. ${doctorName} on ${date}`,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:0;background:#f0f4ff;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:26px;letter-spacing:-0.5px;">DermaSense AI</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Your Skin Health Partner</p>
        </div>

        <!-- Confirmed Banner -->
        <div style="background:#dcfce7;border-left:5px solid #16a34a;padding:16px 24px;margin:0;">
          <p style="color:#166534;font-weight:bold;font-size:16px;margin:0;">✅ Your appointment is CONFIRMED!</p>
          <p style="color:#166534;margin:4px 0 0;font-size:13px;">Dr. ${doctorName} has accepted your booking. All details are below.</p>
        </div>

        <!-- Main Card -->
        <div style="background:white;padding:28px 24px;">
          <p style="color:#374151;font-size:15px;">Hi <strong>${patientName}</strong>,</p>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;">Your dermatology consultation has been confirmed. Please keep this email handy — it contains everything you need for your appointment.</p>

          <!-- Appointment Details Table -->
          <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;">
            <h3 style="color:#1e293b;margin:0 0 14px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">📅 Appointment Details</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:7px 0;color:#64748b;font-size:13px;width:150px;">Date</td><td style="color:#1e293b;font-weight:600;font-size:13px;">${date}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Time</td><td style="color:#1e293b;font-weight:600;font-size:13px;">${time}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Type</td><td style="color:#1e293b;font-weight:600;font-size:13px;">${isVideo ? '🎥 Video Consultation' : '🏥 In-Person Visit'}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Consultation Fee</td><td style="color:#1e293b;font-weight:600;font-size:13px;">₹${fee}</td></tr>
            </table>
          </div>

          <!-- Doctor Details -->
          <div style="background:#eff6ff;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #bfdbfe;">
            <h3 style="color:#1e40af;margin:0 0 14px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">👨‍⚕️ Your Doctor</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:7px 0;color:#64748b;font-size:13px;width:150px;">Name</td><td style="color:#1e293b;font-weight:700;font-size:14px;">Dr. ${doctorName}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Specialty</td><td style="color:#1e293b;font-size:13px;">${specialty}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Hospital</td><td style="color:#1e293b;font-size:13px;">${hospitalName}</td></tr>
              ${hospitalAddress ? `<tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Address</td><td style="color:#1e293b;font-size:13px;">${hospitalAddress}</td></tr>` : ''}
              ${doctorPhone ? `<tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Contact</td><td style="color:#1e293b;font-size:13px;">${doctorPhone}</td></tr>` : ''}
              ${licenseNumber ? `<tr><td style="padding:7px 0;color:#64748b;font-size:13px;">License No.</td><td style="color:#1e293b;font-size:13px;">${licenseNumber}</td></tr>` : ''}
            </table>
          </div>

          ${isVideo ? `
          <!-- Meeting Link -->
          <div style="background:#fef9c3;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #fde047;text-align:center;">
            <h3 style="color:#713f12;margin:0 0 10px;font-size:14px;">🎥 Video Consultation Link</h3>
            <p style="color:#713f12;font-size:13px;margin:0 0 14px;">Click the button below at your appointment time to join the video call.</p>
            <a href="${meetingLink}" style="background:#1d4ed8;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Join Video Call →</a>
            <p style="color:#92400e;font-size:11px;margin:10px 0 0;word-break:break-all;">${meetingLink}</p>
          </div>
          ` : ''}

          <!-- Preparation Tips -->
          <div style="background:#f0fdf4;border-radius:10px;padding:18px 20px;margin:20px 0;border:1px solid #bbf7d0;">
            <h3 style="color:#166534;margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">📋 Before Your Appointment</h3>
            <ul style="color:#374151;font-size:13px;line-height:2;margin:0;padding-left:20px;">
              ${isVideo
                ? '<li>Ensure good lighting and a stable internet connection</li><li>Test your camera and microphone before the call</li><li>Keep your medical records and previous prescriptions ready</li><li>Note down any questions you want to ask the doctor</li>'
                : '<li>Arrive 10–15 minutes before your scheduled time</li><li>Carry a valid photo ID and insurance card if applicable</li><li>Bring any previous skin condition photos or reports</li><li>Avoid applying creams or makeup to the affected area before the visit</li>'
              }
              <li>Your skin condition photos from DermaSense AI analysis can be shared during consultation</li>
            </ul>
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin-top:24px;">
            <a href="${APP_URL}/dashboard/appointments" style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">View My Appointments →</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 24px;text-align:center;background:#f8fafc;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">DermaSense AI • For support contact support@dermaai.com</p>
          <p style="color:#d1d5db;font-size:10px;margin:4px 0 0;">If you did not book this appointment, please contact us immediately.</p>
        </div>
      </div>`,
    textBody: `Appointment Confirmed!\nDoctor: Dr. ${doctorName} (${specialty})\nDate: ${date} at ${time}\nHospital: ${hospitalName}\n${isVideo ? `Meeting Link: ${meetingLink}\n` : ''}Fee: ₹${fee}\n\nView your appointment: ${APP_URL}/dashboard/appointments`,
  })
}

export async function sendAppointmentReminderEmail({
  to, patientName, doctorName, date, time, meetingLink, type
}: {
  to: string; patientName: string; doctorName: string; date: string; time: string; meetingLink?: string; type: string
}) {
  const isVideo = type === 'Video Call' && meetingLink
  await sendEmail({
    to,
    subject: `⏳ Reminder: Appointment with Dr. ${doctorName} Tomorrow`,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <h1 style="color:#1d4ed8;text-align:center;">DermaSense AI</h1>
        <div style="background:white;border-radius:8px;padding:24px;">
          <h2 style="color:#111827;margin-top:0;">Hello, ${patientName}</h2>
          <p>This is a reminder for your upcoming appointment.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Doctor</td><td style="color:#111827;font-weight:bold;">Dr. ${doctorName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="color:#111827;">${date}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="color:#111827;">${time}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Type</td><td style="color:#111827;">${type}</td></tr>
          </table>
          ${isVideo ? `<div style="text-align:center;margin-top:24px;"><a href="${meetingLink}" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Join Video Call</a></div>` : ''}
        </div>
      </div>`,
    textBody: `Reminder: Appointment with Dr. ${doctorName} on ${date} at ${time}.`,
  })
}

