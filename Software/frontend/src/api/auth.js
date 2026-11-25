// Login, register and password functions.
// Login and register ask the backend (POST /auth/login, POST /auth/register).
// Forgot password and face login are NOT connected yet: they wait for Eszter's security work.
import { api, clearToken, saveToken } from './client.js'
import { rolePage } from './convert.js'

// Who is logged in. role is the page name: 'tenant', 'manager' or 'technician'
async function whoAmI() {
  const user = await api('/auth/me')
  return { ...user, role: rolePage(user.role) }
}

// Log in with email and password. Gives back the user, or throws an error.
export async function login(email, password) {
  const answer = await api('/auth/login', { method: 'POST', body: { email, password } })
  saveToken(answer.access_token)
  return whoAmI()
}

// Create a new account and log in straight away.
// Tenants join their house by its address (street + city must match a house in Roomify).
export async function register(newUser) {
  if (newUser.password.length < 8) {
    throw new Error('Your password needs at least 8 characters')
  }
  const answer = await api('/auth/register', {
    method: 'POST',
    body: {
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role === 'manager' ? 'property_manager' : newUser.role,
      street: newUser.street || null,
      city: newUser.city || null,
      room_number: newUser.room || null,
    },
  })
  saveToken(answer.access_token)
  return whoAmI()
}

export function logout() {
  clearToken()
}

// Waits a moment, so the fake functions below feel like a real server.
// "await wait(1000)" means: wait 1 second, then go on.
function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

// Forgot password, step 1. Later: the backend sends an email with a reset link.
// We always say "sent", so nobody can find out which emails have an account.
export async function requestPasswordReset() {
  await wait(1000)
}

// Forgot password, step 2. Later: the backend compares the camera photo with the saved face.
export async function verifyFace() {
  await wait(2000)
}

// Forgot password, step 3: save the new password. Not connected yet (needs Eszter's part).
export async function resetPassword(email, newPassword) {
  await wait(800)
  if (newPassword.length < 8) {
    throw new Error('Your password needs at least 8 characters')
  }
}

// Log in with your face. Not connected yet (needs Eszter's part).
export async function faceLogin() {
  await wait(2000)
  throw new Error('Face login is not ready yet. Please log in with your password.')
}
