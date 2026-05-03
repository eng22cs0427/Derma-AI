/**
 * Internal email helper that re-exports the private sendEmail fn from email.ts
 * This allows other API routes to send custom emails without duplicating SMTP setup.
 */
import nodemailer from 'nodemailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || process.env.SES_FROM_EMAIL || 'noreplydermaai@gmail.com'

export { APP_URL }

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

export async function sendEmail({
  to, subject, htmlBody, textBody,
}: {
  to: string; subject: string; htmlBody: string; textBody: string
}) {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
    console.log(`[Email skipped] To: ${to} | Subject: ${subject}`)
    return
  }
  if (!process.env.BREVO_SMTP_KEY && !process.env.BREVO_SMTP_USER) {
    console.warn('[Email skipped — BREVO not configured]')
    return
  }
  const transporter = createTransporter()
  try {
    const info = await transporter.sendMail({
      from: `"DermaSense AI" <${FROM_EMAIL}>`,
      replyTo: FROM_EMAIL,
      to, subject, html: htmlBody, text: textBody,
    })
    console.log(`[Email sent] To: ${to} | ${info.messageId}`)
  } catch (err) {
    console.error('[Email failed]', err)
  }
}
