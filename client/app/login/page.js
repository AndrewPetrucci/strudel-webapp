'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { setToken } from '@/lib/auth'

const UNVERIFIED_MESSAGE = 'Please verify your email and set your password first'

export default function Login() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resending, setResending] = useState(false)
  const router = useRouter()

  const showResend = error === UNVERIFIED_MESSAGE

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResendMessage('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: login, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      setToken(data.token)
      router.push('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification(e) {
    e.preventDefault()
    setResendMessage('')
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: login, login }),
      })
      const data = await res.json()
      setResendMessage(data.message || 'Check your email.')
    } catch (err) {
      setResendMessage(err.message || 'Failed to resend.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Email or username
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              autoComplete="username email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          {showResend && (
            <p className="auth-hint" style={{ marginTop: '0.5rem' }}>
              Didn&apos;t get the email?{' '}
              <button
                type="button"
                className="auth-inline-link"
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
            </p>
          )}
          {resendMessage && <p className="auth-hint" style={{ marginTop: '0.5rem', color: 'var(--accent)' }}>{resendMessage}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-link">
          No account? <Link href="/signup">Sign up</Link>
        </p>
        <p className="auth-link">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </div>
  )
}
