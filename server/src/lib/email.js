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

function getAppOrigin() {
  const protocol = (process.env.APP_PROTOCOL || 'http').replace(/:?\/?\/?$/, '')
  const host = process.env.APP_HOST || 'localhost'
  let port = process.env.APP_PORT
  if (port === undefined || port === '') {
    port = 3000
  } else {
    port = Number(port)
    if (!Number.isFinite(port)) port = 3000
  }
  const omitPort =
    (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)
  const origin = omitPort ? `${protocol}://${host}` : `${protocol}://${host}:${port}`
  return origin.replace(/\/+$/, '')
}

/** Log email send failure with safe SMTP config (no passwords) for debugging prod issues */
export function logEmailFailure(context, err) {
  const smtpHost = process.env.SMTP_HOST ?? '(not set)'
  const smtpPort = process.env.SMTP_PORT ?? '(default 587)'
  const smtpAuth = !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  console.error(`[email] ${context} failed:`, {
    message: err.message,
    code: err.code,
    ...(err.response ? { response: String(err.response).slice(0, 200) } : {}),
    smtp: { host: smtpHost, port: smtpPort, authConfigured: smtpAuth },
  })
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack)
  }
}

export async function sendVerificationEmail(email, token) {
  const url = `${getAppOrigin()}/verify-email?token=${encodeURIComponent(token)}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your email and set your password',
    text: `Click the link to verify your email and set your password: ${url}`,
    html: `<p>Click the link to verify your email and set your password: <a href="${url}">${url}</a></p>`,
  })
}

export async function sendPasswordResetEmail(email, token) {
  const url = `${getAppOrigin()}/reset-password?token=${encodeURIComponent(token)}`
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
