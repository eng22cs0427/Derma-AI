/**
 * AWS SES Email Service — via SMTP Transport
 *
 * Uses AWS SES SMTP credentials (nodemailer) to send transactional emails.
 * SMTP credentials are different from IAM credentials — they come from:
 *   AWS Console → SES → SMTP Settings → Create SMTP credentials
 *
 * Current config uses SES_SMTP_USER / SES_SMTP_PASSWORD from .env.local
 */

import nodemailer from 'nodemailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@dermasense.ai';
const REPLY_TO = process.env.SES_REPLY_TO_EMAIL || FROM_EMAIL;

/** Create the SMTP transporter using SES SMTP settings */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
    port: Number(process.env.SES_SMTP_PORT) || 587,
    secure: false, // TLS (STARTTLS) on port 587
    auth: {
      user: process.env.SES_SMTP_USER || '',
      pass: process.env.SES_SMTP_PASSWORD || '',
    },
  });
}

/** Low-level send helper */
async function sendEmail({
  to,
  subject,
  htmlBody,
  textBody,
}: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}) {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
    console.log(`[Email skipped — ENABLE_EMAIL_NOTIFICATIONS=false] To: ${to} | Subject: ${subject}`);
    return;
  }

  if (!process.env.SES_SMTP_USER || !process.env.SES_SMTP_PASSWORD) {
    console.warn('[Email skipped — SES_SMTP_USER or SES_SMTP_PASSWORD not configured]');
    return;
  }

  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"DermaSense AI" <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject,
      html: htmlBody,
      text: textBody,
    });
    console.log(`[Email sent] To: ${to} | MessageId: ${info.messageId}`);
  } catch (error) {
    // Non-fatal — email failure should never break the main request
    console.error('[Email send failed]', error);
  }
}

/* ─────────────────────────────────────────────────────────────
   EMAIL TEMPLATES
───────────────────────────────────────────────────────────── */

/** Welcome email sent to newly registered patients */
export async function sendWelcomeEmail({
  to,
  fullName,
}: {
  to: string;
  fullName: string;
}) {
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
            <li>🛒 Access our medical shop</li>
          </ul>
          <div style="text-align:center;margin-top:24px;">
            <a href="${APP_URL}/dashboard" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
              Go to Dashboard →
            </a>
          </div>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
          DermaSense AI • If you didn't create this account, ignore this email.
        </p>
      </div>`,
    textBody: `Welcome to DermaSense AI, ${fullName}!\n\nYour account is ready. Log in at: ${APP_URL}/dashboard`,
  });
}

/** Appointment confirmation sent to patient after booking */
export async function sendAppointmentConfirmationEmail({
  to,
  patientName,
  doctorName,
  specialty,
  date,
  time,
  consultationType,
  totalFee,
}: {
  to: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  consultationType: string;
  totalFee: number;
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
            <a href="${APP_URL}/dashboard/appointments" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
              View Appointment →
            </a>
          </div>
        </div>
      </div>`,
    textBody: `Appointment Confirmed!\nDoctor: Dr. ${doctorName} (${specialty})\nDate: ${date} at ${time}\nType: ${consultationType}\nFee: ₹${totalFee}\n\nView: ${APP_URL}/dashboard/appointments`,
  });
}

/** Skin analysis result alert — sent when AI analysis completes */
export async function sendAnalysisResultEmail({
  to,
  patientName,
  riskLevel,
  predictionClass,
  confidence,
}: {
  to: string;
  patientName: string;
  riskLevel: string;
  predictionClass: string;
  confidence: number;
}) {
  const isHighRisk = ['High', 'Very High'].includes(riskLevel);
  await sendEmail({
    to,
    subject: isHighRisk
      ? `⚠️ Skin Analysis — ${riskLevel} Risk Detected`
      : `✅ Skin Analysis Complete — ${riskLevel} Risk`,
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
          ${isHighRisk ? `<div style="background:#fff7ed;border-radius:8px;padding:12px;margin-top:16px;"><p style="color:#92400e;margin:0;">⚕️ <strong>Please consult a dermatologist soon.</strong></p></div>` : ''}
          <div style="text-align:center;margin-top:24px;">
            <a href="${APP_URL}/dashboard/analysis" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
              View Full Report →
            </a>
          </div>
        </div>
      </div>`,
    textBody: `Analysis Result\nRisk: ${riskLevel}\nCondition: ${predictionClass}\nConfidence: ${confidence.toFixed(1)}%\n\nView: ${APP_URL}/dashboard/analysis`,
  });
}

/** Doctor review notification — sent when doctor adds notes */
export async function sendDoctorReviewEmail({
  to,
  patientName,
  doctorName,
  doctorNotes,
  followUpRequired,
  followUpDate,
}: {
  to: string;
  patientName: string;
  doctorName: string;
  doctorNotes: string;
  followUpRequired: boolean;
  followUpDate?: string;
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
            <a href="${APP_URL}/dashboard/analysis" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
              View Analysis →
            </a>
          </div>
        </div>
      </div>`,
    textBody: `Dr. ${doctorName} reviewed your analysis.\nNotes: "${doctorNotes}"${followUpRequired ? `\nFollow-up: ${followUpDate}` : ''}\n\nView: ${APP_URL}/dashboard/analysis`,
  });
}

/** Appointment status update (confirmed/cancelled/completed by doctor) */
export async function sendAppointmentStatusEmail({
  to,
  patientName,
  doctorName,
  date,
  time,
  newStatus,
  reason,
}: {
  to: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  newStatus: 'Confirmed' | 'Cancelled' | 'Completed';
  reason?: string;
}) {
  const cfg = {
    Confirmed: { emoji: '✅', color: '#166534', bg: '#dcfce7' },
    Cancelled: { emoji: '❌', color: '#991b1b', bg: '#fef2f2' },
    Completed: { emoji: '🎉', color: '#1e40af', bg: '#dbeafe' },
  }[newStatus];

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
            <a href="${APP_URL}/dashboard/appointments" style="background:#1d4ed8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
              View Appointments →
            </a>
          </div>
        </div>
      </div>`,
    textBody: `Appointment ${newStatus}: Dr. ${doctorName} on ${date} at ${time}${reason ? `\nReason: ${reason}` : ''}\n\nView: ${APP_URL}/dashboard/appointments`,
  });
}
