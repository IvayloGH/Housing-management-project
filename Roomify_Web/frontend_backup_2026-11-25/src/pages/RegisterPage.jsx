import { useState } from 'react'
import { useNavigate } from 'react-router'
import { register } from '../api/auth.js'
import Logo from '../components/Logo.jsx'
import PageHeader from '../components/PageHeader.jsx'

// The three roles you can choose from
const roles = [
  { value: 'tenant', title: 'Tenant', text: 'I live in a student house and share chores, groceries and repairs.' },
  { value: 'manager', title: 'Property manager', text: 'I manage student houses and send technicians for repairs.' },
  { value: 'technician', title: 'Technician', text: 'I fix things in student houses.' },
]

function RegisterPage() {
  const [role, setRole] = useState('tenant')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [room, setRoom] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      // A house is found by its street + city
      const user = await register({ role, name, email, password, street, city, room })
      navigate('/' + user.role)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <header className="app-header">
        <Logo />
      </header>

      <PageHeader eyebrow="New account · Choose your role" title="Create your account." />

      <form className="page-body form-page" onSubmit={handleSubmit}>
        <section className="card">
          <h2>Who are you?</h2>
          <div className="role-options">
            {roles.map((r) => (
              <label key={r.value} className={role === r.value ? 'role-option selected' : 'role-option'}>
                <input
                  type="radio"
                  name="role"
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                />
                <strong>{r.title}</strong>
                <span>{r.text}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Security rule (backend): only tenants can sign up themselves.
            Manager and technician accounts are made by an administrator (backend/create_account.py). */}
        {role !== 'tenant' && (
          <section className="card">
            <h2>Accounts for staff</h2>
            <p>
              Property managers and technicians don't sign up here. Roomify creates your account for you:
              ask the Roomify team for your login details.
            </p>
          </section>
        )}

        {role === 'tenant' && (
        <section className="card">
          <h2>Your account</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" placeholder="Your full name" value={name}
                onChange={(e) => setName(e.target.value)} required />
            </div>
            {/* Empty box, so Email starts on a new line */}
            <div />
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="name@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="At least 8 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
        </section>
        )}

        {/* Only tenants live in a house, so only they fill in an address */}
        {role === 'tenant' && (
          <section className="card">
            <h2>Your address</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="street">Street and house number</label>
                <input id="street" placeholder="e.g. Kerkstraat 12" value={street}
                  onChange={(e) => setStreet(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="city">City</label>
                <input id="city" placeholder="e.g. Eindhoven" value={city}
                  onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="room">Room number</label>
                <input id="room" placeholder="e.g. 06" value={room}
                  onChange={(e) => setRoom(e.target.value)} required />
              </div>
            </div>
          </section>
        )}

        {error && <p className="error">{error}</p>}

        {role === 'tenant' && (
          <div>
            <button type="submit" className="btn">Enter household</button>
          </div>
        )}
      </form>
    </div>
  )
}

export default RegisterPage
