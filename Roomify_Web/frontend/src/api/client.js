// Talks to the FastAPI backend.
// Every page asks the backend through api(...) below, so the address, the login token
// and the error messages are handled in one place.

// Where the backend runs. Change it in frontend/.env.local (see .env.example).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// The login token is kept in the browser, so you stay logged in after a refresh.
const TOKEN_KEY = 'roomify-token'

// Sent to the whole app when the backend says the login is no longer valid (401).
// api/user.jsx listens for it and logs the user out, so they land on the login page.
export const SESSION_ENDED = 'roomify-session-ended'

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function hasToken() {
  return localStorage.getItem(TOKEN_KEY) !== null
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

// An Error that also remembers the HTTP status, e.g. err.status === 401
function apiError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

// Ask the backend something.
//   api('/groceries')                                  -> GET
//   api('/groceries', { method: 'POST', body: {...} }) -> send JSON
//   api('/tickets/3/photos', { method: 'POST', file }) -> upload a file
//   api('/auth/face/setup', { method: 'POST', file, fields: { consent: true } }) -> file + form fields
export async function api(path, { method = 'GET', body, file, fields } = {}) {
  const headers = {}
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    headers.Authorization = 'Bearer ' + token
  }

  let payload
  if (file) {
    payload = new FormData()
    payload.append('file', file, file.name || 'photo.jpg')
    Object.entries(fields || {}).forEach(([name, value]) => payload.append(name, String(value)))
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(API_URL + path, { method, headers, body: payload })
  } catch {
    throw apiError("Can't reach the server. Is the backend running?", 0)
  }

  // We sent a token but the backend doesn't accept it (expired after 30 minutes, or the
  // password was changed): forget it, and let the app send the user to the login page.
  if (response.status === 401 && token) {
    clearToken()
    window.dispatchEvent(new Event(SESSION_ENDED))
    throw apiError('Your session has ended. Please log in again.', 401)
  }

  if (response.status === 204) return null // "done, nothing to send back"
  const data = await response.json().catch(() => null)
  if (!response.ok) throw apiError(errorText(data, response.status), response.status)
  return data
}

// Photos are saved by the backend as "/uploads/...": make it a full web address
export function photoUrl(url) {
  return url ? API_URL + url : null
}
