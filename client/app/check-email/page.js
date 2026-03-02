'use client'

import Link from 'next/link'

export default function CheckEmail() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Check your email</h1>
        <p className="auth-hint" style={{ marginBottom: '1rem' }}>
          We sent you a link to verify your email and set your password. Click the link in the email to continue.
        </p>
        <p className="auth-link">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
