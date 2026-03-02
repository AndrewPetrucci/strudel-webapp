'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { setToken } from '@/lib/auth'

function VerifyEmailForm() {
  const [token, setTokenInput] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const t = searchParams.get('token')
    if (t) setTokenInput(t)
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setToken(data.token)
      router.push('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const hasToken = !!token

  return (
    <form onSubmit={handleSubmit}>
      {!hasToken && (
        <label>
          Verification token (from email link)
          <input
            type="text"
            value={token}
            onChange={(e) => setTokenInput(e.target.value)}
            required
            placeholder="Paste token from email"
          />
        </label>
      )}
      <label>
        Username
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={50}
          placeholder="lowercase letters, numbers, underscores"
          autoComplete="username"
        />
      </label>
      <p className="auth-hint">3–50 characters, lowercase letters, numbers, underscores only</p>
      <label>
        {hasToken ? 'Set your password' : 'New password'}
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
        {loading ? 'Verifying…' : 'Verify and set password'}
      </button>
    </form>
  )
}

export default function VerifyEmail() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Verify your email</h1>
        <p className="auth-hint" style={{ marginBottom: '1rem' }}>
          Enter the token from your email and choose a password.
        </p>
        <Suspense fallback={<p>Loading…</p>}>
          <VerifyEmailForm />
        </Suspense>
        <p className="auth-link" style={{ marginTop: '1rem' }}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
