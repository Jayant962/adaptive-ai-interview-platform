/**
 * api.js
 * In development: Vite proxies /api → http://localhost:8000/api
 * In production:  set VITE_API_URL=https://your-backend.onrender.com
 *                 and requests go to that origin directly.
 */
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res  = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

// apiMultipart removed — all answers are now plain JSON text.
