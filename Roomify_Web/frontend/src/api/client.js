// Talks to the FastAPI backend.
// Every page asks the backend through api(...) below, so the address, the login token
// and the error messages are handled in one place.

// Where the backend runs. Change it in frontend/.env.local (see .env.example).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// The login token is kept in the browser, so you stay logged in after a refresh.
const TOKEN_KEY = 'roomify-token'

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Turns the backend's error into one readable sentence
function errorText(data, status) {
  const detail = data && data.detail
  if (typeof detail === 'string') return detail
  // FastAPI checks the input itself and then sends a list of problems: show the first one
  if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) return detail[0].msg
  // The password rules send a plain list of sentences
  if (Array.isArray(detail) && typeof detail[0] === 'string') return detail.join('. ')
  return 'Something went wrong (error ' + status + ')'
}

// Ask the backend something.
//   api('/groceries')                                  -> GET
//   api('/groceries', { method: 'POST', body: {...} }) -> send JSON
//   api('/tickets/3/photos', { method: 'POST', file }) -> upload a file
export async function api(path, { method = 'GET', body, file } = {}) {
  const headers = {}
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    headers.Authorization = 'Bearer ' + token
  } else if (import.meta.env.VITE_DEV_USER_ID) {
    // LOCAL TESTING ONLY, with backend/main_dev.py: act as this user without logging in
    headers['X-Dev-User'] = import.meta.env.VITE_DEV_USER_ID
  }

  let payload
  if (file) {
    payload = new FormData()
    payload.append('file', file)
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(API_URL + path, { method, headers, body: payload })
  } catch {
    throw new Error("Can't reach the server. Is the backend running?")
  }

  if (response.status === 204) return null // "done, nothing to send back"
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(errorText(data, response.status))
  return data
}

// Photos are saved by the backend as "/uploads/...": make it a full web address
export function photoUrl(url) {
  return url ? API_URL + url : null
}
