import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import validator from 'validator'
import { pool } from '../../db.js'
import { optionalAuth } from '../../middleware/auth.js'
import { sendVerificationEmail, sendPasswordResetEmail, sendTestEmail, logEmailFailure } from '../../lib/email.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'
const SALT_ROUNDS = 12
const ACCESS_TOKEN_EXP = process.env.JWT_EXPIRES_IN || '7d'
const VERIFY_EXP = '24h'
const RESET_EXP = '1h'

function signAccessToken(userId, email) {
  return jwt.sign(
    { sub: userId, email, purpose: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXP }
  )
}

function toUser(row) {
  if (!row) return null
  const { password_hash, ...user } = row
  return user
}

/** POST /api/auth/signup — email only; user sets password after clicking verification link */
router.post('/signup', async (req, res) => {
  const email = validator.normalizeEmail(String(req.body.email || '').trim())

  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  try {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, NULL) RETURNING id, email, email_verified_at, created_at',
      [email]
    )
    const user = rows[0]

    const verifyToken = jwt.sign(
      { sub: user.id, email, purpose: 'email_verification' },
      JWT_SECRET,
      { expiresIn: VERIFY_EXP }
    )
    try {
      await sendVerificationEmail(email, verifyToken)
    } catch (err) {
      logEmailFailure('Send verification email', err)
    }

    res.status(201).json({ user: toUser(user), message: 'Check your email to set your password' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Signup failed' })
  }
})

/** POST /api/auth/login — body: { email } or { login }; value can be email or username */
router.post('/login', async (req, res) => {
  const raw = String(req.body.email || req.body.login || '').trim()
  const password = String(req.body.password || '')

  if (!raw) {
    return res.status(400).json({ error: 'Email or username is required' })
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' })
  }

  const isEmail = raw.includes('@') && validator.isEmail(raw)
  const email = isEmail ? validator.normalizeEmail(raw) : null
  const username = !isEmail ? raw.toLowerCase() : null

  try {
    const { rows } = await pool.query(
      email
        ? 'SELECT id, email, username, password_hash, email_verified_at, created_at FROM users WHERE email = $1'
        : 'SELECT id, email, username, password_hash, email_verified_at, created_at FROM users WHERE username = $1',
      [email ?? username]
    )
    const user = rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Please verify your email and set your password first' })
    }
    if (!(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signAccessToken(user.id, user.email)
    res.json({ user: toUser(user), token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

/** GET /api/auth/me */
router.get('/me', optionalAuth, (req, res) => {
  res.json({ user: req.user })
})

/** POST /api/auth/verify-email — body: { token, newPassword, username }. Verifies email, sets password and username; returns user + token. */
router.post('/verify-email', async (req, res) => {
  const token = req.body.token || req.query.token
  const newPassword = String(req.body.newPassword || req.body.password || '')
  const username = String(req.body.username || '').trim().toLowerCase()
  if (!token) {
    return res.status(400).json({ error: 'Token is required' })
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  if (!username || username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'Username must be 3–50 characters' })
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers, and underscores' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.purpose !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid token' })
    }
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE username = $1', [username])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already taken' })
    }
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    const { rows } = await pool.query(
      'UPDATE users SET email_verified_at = NOW(), password_hash = $1, username = $2 WHERE id = $3 RETURNING id, email, username, email_verified_at, created_at',
      [password_hash, username, payload.sub]
    )
    const user = rows[0]
    if (!user) {
      return res.status(400).json({ error: 'User not found' })
    }
    const accessToken = signAccessToken(user.id, user.email)
    res.json({ user: toUser(user), token: accessToken })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid or expired token' })
  }
})

/** POST /api/auth/resend-verification — body: { email } or { login }. Resends verification email if user exists and has no password set. */
router.post('/resend-verification', async (req, res) => {
  const raw = String(req.body.email || req.body.login || '').trim()
  if (!raw) {
    return res.status(400).json({ error: 'Email or username is required' })
  }
  const isEmail = raw.includes('@') && validator.isEmail(raw)
  const email = isEmail ? validator.normalizeEmail(raw) : null
  const username = !isEmail ? raw.toLowerCase() : null

  try {
    const { rows } = await pool.query(
      email
        ? 'SELECT id, email, password_hash FROM users WHERE email = $1'
        : 'SELECT id, email, password_hash FROM users WHERE username = $1',
      [email ?? username]
    )
    const user = rows[0]
    if (!user) {
      return res.json({ message: 'If that account exists and is unverified, you will receive a new verification link.' })
    }
    if (user.password_hash) {
      return res.json({ message: 'If that account exists and is unverified, you will receive a new verification link.' })
    }
    const verifyToken = jwt.sign(
      { sub: user.id, email: user.email, purpose: 'email_verification' },
      JWT_SECRET,
      { expiresIn: VERIFY_EXP }
    )
    try {
      await sendVerificationEmail(user.email, verifyToken)
    } catch (err) {
      logEmailFailure('Resend verification email', err)
    }
    return res.json({ message: 'Verification email sent. Check your inbox.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Request failed' })
  }
})

/** POST /api/auth/forgot-password */
router.post('/forgot-password', async (req, res) => {
  const email = validator.normalizeEmail(String(req.body.email || '').trim())
  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }
  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE email = $1', [email])
    if (rows.length > 0) {
      const resetToken = jwt.sign(
        { sub: rows[0].id, email: rows[0].email, purpose: 'password_reset' },
        JWT_SECRET,
        { expiresIn: RESET_EXP }
      )
      try {
        await sendPasswordResetEmail(rows[0].email, resetToken)
      } catch (err) {
        logEmailFailure('Send password reset email', err)
      }
    }
    res.json({ message: 'If that email is registered, you will receive a reset link' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Request failed' })
  }
})

/** POST /api/auth/reset-password */
router.post('/reset-password', async (req, res) => {
  const token = req.body.token || req.query.token
  const newPassword = String(req.body.newPassword || req.body.password || '')
  if (!token) {
    return res.status(400).json({ error: 'Token is required' })
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token' })
    }
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      password_hash,
      payload.sub,
    ])
    res.json({ message: 'Password reset' })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid or expired token' })
  }
})

/** POST /api/auth/test-email — dev only */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-email', async (req, res) => {
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(503).json({
          error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in server/.env',
        })
      }
      const email = validator.normalizeEmail(String(req.body?.email || '').trim())
      if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ error: 'Valid email is required' })
      }
      await sendTestEmail(email)
      return res.json({ message: 'Test email sent' })
    } catch (err) {
      console.error('Test email error:', err)
      return res.status(500).json({
        error: err.message || 'Failed to send test email',
      })
    }
  })
}

export default router
