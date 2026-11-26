// Login, register and logout.
// Login and register ask the backend (POST /auth/login, POST /auth/register).
// Face login asks the backend too (POST /auth/face/login), but is switched off in config.js for now.
// Forgot password is NOT available yet: there is no backend for it (see ForgotPasswordPage.jsx).
import { api, clearToken, saveToken } from './client.js'
import { rolePage } from './convert.js'

// Who is logged in: the full profile (GET /users/me).
// role is the page name: 'tenant', 'manager' or 'technician'
export async function whoAmI() {
  const user = await api('/users/me')
  return { ...user, role: rolePage(user.role) }
}

// Log in with email and password. Gives back the user, or throws an error.
export async function login(email, password) {
  const answer = await api('/auth/login', { method: 'POST', body: { email: email.trim(), password } })
  saveToken(answer.access_token)
  return whoAmI()
}

// Create a new tenant account and log in straight away.
// Tenants join their house by its address (street + city must match a house in Roomify).
// Managers and technicians can't sign up themselves (backend/create_account.py makes them).
export async function register(newUser) {
  if (newUser.password.length < 8) {
    throw new Error('Your password needs at least 8 characters')
  }
  const answer = await api('/auth/register', {
    method: 'POST',
    body: {
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      password: newUser.password,
      role: 'tenant',
      street: newUser.street.trim() || null,
      city: newUser.city.trim() || null,
      room_number: newUser.room.trim() || null,
    },
  })
  saveToken(answer.access_token)
  return whoAmI()
}

export function logout() {
  clearToken()
}

// Log in with only your face: the backend finds out who is in the photo.
export async function faceLogin(photo) {
  const answer = await api('/auth/face/login', { method: 'POST', file: photo })
  saveToken(answer.access_token)
  return whoAmI()
}
