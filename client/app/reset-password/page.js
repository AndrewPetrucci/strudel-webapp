'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetPasswordForm() {
  const [token, setTokenState] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const t = searchParams.get('token')
    if (t) setTokenState(t)
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <p className="auth-hint" style={{ marginBottom: '1rem' }}>
        Password reset. Redirecting to sign in…
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Reset token (from email link)
        <input
          type="text"
          value={token}
          onChange={(e) => setTokenState(e.target.value)}
          required
          placeholder="Paste token from email"
        />
      </label>
      <label>
        New password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <p className="auth-hint">Password must be at least 8 characters</p>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  )
}

export default function ResetPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset password</h1>
        <p className="auth-hint" style={{ marginBottom: '1rem' }}>
          Enter the token from your email and choose a new password.
        </p>
        <Suspense fallback={<p>Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="auth-link" style={{ marginTop: '1rem' }}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
