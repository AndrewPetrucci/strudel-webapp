import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'

export async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    req.user = null
    return next()
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.sub == null) {
      req.user = null
      return next()
    }
    const { rows } = await pool.query(
      'SELECT id, email, username, email_verified_at, created_at FROM users WHERE id = $1',
      [payload.sub]
    )
    req.user = rows[0] ?? null
  } catch (_) {
    req.user = null
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}
