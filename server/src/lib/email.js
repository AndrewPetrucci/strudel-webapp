import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
})

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

export async function sendVerificationEmail(email, token) {
  const url = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your email and set your password',
    text: `Click the link to verify your email and set your password: ${url}`,
    html: `<p>Click the link to verify your email and set your password: <a href="${url}">${url}</a></p>`,
  })
}

export async function sendPasswordResetEmail(email, token) {
  const url = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your password',
    text: `Reset your password: ${url}. This link expires in 1 hour.`,
    html: `<p>Reset your password: <a href="${url}">${url}</a></p><p>This link expires in 1 hour.</p>`,
  })
}

export async function sendTestEmail(to) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Test email from Strudel Webapp',
    text: 'If you received this, SMTP is configured correctly.',
    html: '<p>If you received this, SMTP is configured correctly.</p>',
  })
}
