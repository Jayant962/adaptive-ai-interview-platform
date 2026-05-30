import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../utils/api.js'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSuccess('Your password has been sent to your registered email address.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">🤖</div>
          <span className="auth-brand-name">AI Interviewer</span>
        </div>

        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-sub">Enter your email and we'll send your password</p>

        {error   && <div className="alert alert-error"><span>⚠</span> {error}</div>}
        {success && <div className="alert alert-success"><span>✓</span> {success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Registered Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" /> Sending...</> : 'Send Password'}
          </button>
        </form>

        <div className="auth-link-row">
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}
