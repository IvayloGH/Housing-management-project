// Fake users until the real backend is ready.
// Later this function will call Ivaylo's POST /auth/login instead.
const fakeUsers = [
  { email: 'tenant@roomify.nl', password: 'test123', role: 'tenant' },
  { email: 'manager@roomify.nl', password: 'test123', role: 'manager' },
  { email: 'tech@roomify.nl', password: 'test123', role: 'technician' },
]

export function login(email, password) {
  const user = fakeUsers.find(
    (u) => u.email === email && u.password === password
  )
  if (!user) {
    throw new Error('Wrong email or password')
  }
  return user
}
