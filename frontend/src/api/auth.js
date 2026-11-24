// Login, register and password functions.
// For now they use fake users. Later they will ask Ivaylo's backend instead
// (for example POST /auth/login), and the pages don't have to change.

const fakeUsers = [
  { email: 'tenant@roomify.nl', password: 'test123', role: 'tenant' },
  { email: 'manager@roomify.nl', password: 'test123', role: 'manager' },
  { email: 'tech@roomify.nl', password: 'test123', role: 'technician' },
]

// Remembers who logged in last on this computer, so face login knows who you are.
// localStorage is a small storage in the browser that stays after a refresh.
function rememberUser(email) {
  localStorage.setItem('roomify-face-user', email)
}

// Log in with email and password. Gives back the user, or an error.
export function login(email, password) {
  const user = fakeUsers.find((u) => u.email === email && u.password === password)
  if (!user) {
    throw new Error('Wrong email or password')
  }
  rememberUser(user.email)
  return user
}

// Create a new account. New accounts are gone after a page refresh.
export function register(newUser) {
  if (newUser.password.length < 8) {
    throw new Error('Your password needs at least 8 characters')
  }
  const alreadyExists = fakeUsers.find((u) => u.email === newUser.email)
  if (alreadyExists) {
    throw new Error('There is already an account with this email')
  }
  fakeUsers.push(newUser)
  rememberUser(newUser.email)
  return newUser
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

// Forgot password, step 3: save the new password.
export async function resetPassword(email, newPassword) {
  await wait(800)
  if (newPassword.length < 8) {
    throw new Error('Your password needs at least 8 characters')
  }
  const user = fakeUsers.find((u) => u.email === email)
  if (user) {
    user.password = newPassword
  }
}

// Log in with your face. Later: the backend recognises the face.
// For now we use the last person who logged in on this computer.
export async function faceLogin() {
  await wait(2000)
  const email = localStorage.getItem('roomify-face-user')
  const user = fakeUsers.find((u) => u.email === email)
  if (!user) {
    throw new Error("We couldn't recognise you. Log in with your password first.")
  }
  return user
}
