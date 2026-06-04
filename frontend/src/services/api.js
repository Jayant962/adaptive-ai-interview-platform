/**
 * API Service
 * All backend communication using native Fetch API.
 * No Axios, no React Query - just fetch.
 */

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_URL = rawApiUrl.replace(/\/$/, '')

/**
 * Core fetch wrapper with auth header injection
 */
async function apiFetch(path, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

export async function syncUser(userData) {
  return apiFetch('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

export async function getProfile(token) {
  return apiFetch('/api/auth/profile', {}, token)
}

export async function sendTestEmail(token) {
  return apiFetch('/api/auth/test-email', { method: 'POST' }, token)
}

// ─────────────────────────────────────────────
// INTERVIEW
// ─────────────────────────────────────────────

export async function startInterview(token, { topic, difficulty, customTopic }) {
  return apiFetch('/api/interview/start', {
    method: 'POST',
    body: JSON.stringify({
      topic,
      difficulty,
      custom_topic: customTopic || null,
    }),
  }, token)
}

export async function submitAnswer(token, { sessionId, questionId, transcript, duration }) {
  return apiFetch('/api/interview/submit-answer', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      question_id: questionId,
      transcript,
      duration,
    }),
  }, token)
}

export async function getFollowUp(token, { sessionId, questionId, userAnswer, followUpCount }) {
  return apiFetch('/api/interview/follow-up', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      question_id: questionId,
      user_answer: userAnswer,
      follow_up_count: followUpCount,
    }),
  }, token)
}

export async function getNextQuestion(token, sessionId) {
  return apiFetch('/api/interview/next-question', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  }, token)
}

export async function endInterview(token, sessionId) {
  return apiFetch('/api/interview/end', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  }, token)
}

export async function getInterviewHistory(token, limit = 20, offset = 0) {
  return apiFetch(`/api/interview/history?limit=${limit}&offset=${offset}`, {}, token)
}

export async function getInterviewSession(token, sessionId) {
  return apiFetch(`/api/interview/${sessionId}`, {}, token)
}

// ─────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────

export async function getReport(token, sessionId) {
  return apiFetch(`/api/reports/${sessionId}`, {}, token)
}

export async function getReportsList(token) {
  return apiFetch('/api/reports/list', {}, token)
}

export async function getAnalytics(token) {
  return apiFetch('/api/reports/analytics/me', {}, token)
}

export async function getOverallReport(token) {
  return apiFetch('/api/reports/overall', {}, token)
}

