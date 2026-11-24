import { useState } from 'react'
import { useNavigate } from 'react-router'
import FaceCamera from './FaceCamera.jsx'
import Icon from './Icon.jsx'

// Cards that are used on the profile page of every role

// "Personal details": name, phone, email and one optional extra field (e.g. Company)
export function PersonalDetailsCard({ title = 'Personal details', extraField }) {
  const [saved, setSaved] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <form className="card" onSubmit={handleSubmit} onChange={() => setSaved(false)}>
      <h2>{title}</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" placeholder="Your full name" />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" placeholder="Your phone number" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="Your email address" />
        </div>
        {extraField && (
          <div className="field">
            <label htmlFor="extra">{extraField}</label>
            <input id="extra" placeholder={extraField + ' name'} />
          </div>
        )}
      </div>
      <div className="card-footer">
        <button type="submit" className="btn">Save changes</button>
        {saved && <span className="saved"><Icon name="check" /> Saved</span>}
      </div>
    </form>
  )
}

// "Your home": the tenant's address
export function AddressCard() {
  const [saved, setSaved] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <form className="card" onSubmit={handleSubmit} onChange={() => setSaved(false)}>
      <h2>Your home</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="street">Street and house number</label>
          <input id="street" placeholder="Street and house number" />
        </div>
        <div className="field">
          <label htmlFor="postcode">Postcode</label>
          <input id="postcode" placeholder="Postcode" />
        </div>
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" placeholder="City" />
        </div>
        <div className="field">
          <label htmlFor="room">Room number</label>
          <input id="room" placeholder="Room number" />
        </div>
      </div>
      <div className="card-footer">
        <button type="submit" className="btn">Update address</button>
        {saved && <span className="saved"><Icon name="check" /> Saved</span>}
      </div>
    </form>
  )
}

// "Password and sign-in": change password and set up face login
export function SignInCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [checking, setChecking] = useState(false)
  const [faceOn, setFaceOn] = useState(false)

  function savePassword(event) {
    event.preventDefault()
    if (newPassword.length < 8) {
      setPasswordError('Your password needs at least 8 characters')
      return
    }
    setPasswordError('')
    setNewPassword('')
    setShowPassword(false)
    setPasswordSaved(true)
  }

  function saveFace() {
    setChecking(true)
    setTimeout(() => {
      setChecking(false)
      setShowCamera(false)
      setFaceOn(true)
    }, 2000)
  }

  return (
    <section className="card">
      <h2>Password and sign-in</h2>

      <div className="list-row">
        <div>
          <strong>Password</strong>
          {passwordSaved && <p className="row-sub saved"><Icon name="check" /> Password changed</p>}
        </div>
        <button type="button" className="btn btn-light btn-small" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? 'Cancel' : 'Change password'}
        </button>
      </div>
      {showPassword && (
        <form className="inline-form" onSubmit={savePassword}>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          {passwordError && <p className="error">{passwordError}</p>}
          <button type="submit" className="btn btn-small">Save password</button>
        </form>
      )}

      <div className="list-row">
        <div>
          <strong>Face recognition</strong>
          <p className="row-sub">
            {faceOn ? <><Icon name="check" /> Face login is on</> : 'Log in with your face instead of a password'}
          </p>
        </div>
        {!faceOn && (
          <button type="button" className="btn btn-light btn-small" onClick={() => setShowCamera(!showCamera)}>
            {showCamera ? 'Cancel' : 'Set up face login'}
          </button>
        )}
      </div>
      {showCamera && (
        <div className="inline-form camera-small">
          <FaceCamera loading={checking} onVerify={saveFace} buttonText="Save my face" />
        </div>
      )}
    </section>
  )
}

// "Log out"
export function LogoutCard() {
  const navigate = useNavigate()
  return (
    <section className="card card-row">
      <h2>Log out</h2>
      <button type="button" className="btn btn-light" onClick={() => navigate('/')}>
        Log out
      </button>
    </section>
  )
}
