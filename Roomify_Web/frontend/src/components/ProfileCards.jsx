import { useState } from 'react'
import { useNavigate } from 'react-router'
import FaceCamera from './FaceCamera.jsx'
import Icon from './Icon.jsx'
import { useApi } from '../api/useApi.js'
import { changePassword, getFaceStatus, getProfile, setupFace, turnOffFace, updateProfile } from '../api/roomify.js'
import { logout } from '../api/auth.js'

// Cards that are used on the profile page of every role

// "Personal details": name and email, saved in the backend
export function PersonalDetailsCard({ title = 'Personal details' }) {
  const { data } = useApi(getProfile)
  // Show the page first, then the form when the profile is loaded
  return (
    <section className="card">
      {data ? <DetailsForm title={title} profile={data} /> : <h2>{title}</h2>}
    </section>
  )
}

function DetailsForm({ title, profile }) {
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      await updateProfile({ name, email })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} onChange={() => setSaved(false)}>
      <h2>{title}</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="Your email address" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="card-footer">
        <button type="submit" className="btn">Save changes</button>
        {saved && <span className="saved"><Icon name="check" /> Saved</span>}
      </div>
    </form>
  )
}

// "Your home": the tenant's house and room
export function AddressCard() {
  const { data } = useApi(getProfile)
  return (
    <section className="card">
      <h2>Your home</h2>
      <div className="detail-row"><span>House</span><strong>{data ? data.house_name : '…'}</strong></div>
      <div className="detail-row"><span>Room</span><strong>{data ? data.room_number || '-' : '…'}</strong></div>
      <p className="row-sub">Moving to another house? Ask your property manager.</p>
    </section>
  )
}

// "Password and sign-in": change password and set up face login
export function SignInCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [checking, setChecking] = useState(false)
  const [consent, setConsent] = useState(false)
  const [faceError, setFaceError] = useState('')
  const face = useApi(getFaceStatus)
  const faceOn = face.data ? face.data.is_set_up : false

  async function savePassword(event) {
    event.preventDefault()
    if (newPassword.length < 8) {
      setPasswordError('Your password needs at least 8 characters')
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordError('')
      setCurrentPassword('')
      setNewPassword('')
      setShowPassword(false)
      setPasswordSaved(true)
    } catch (err) {
      setPasswordError(err.message)
    }
  }

  // Send the camera photo: the backend keeps only an encrypted template of the face
  async function saveFace(photo) {
    setFaceError('')
    setChecking(true)
    try {
      await setupFace(photo)
      setShowCamera(false)
      face.reload()
    } catch (err) {
      setFaceError(err.message)
    }
    setChecking(false)
  }

  async function removeFace() {
    setFaceError('')
    try {
      await turnOffFace()
      face.reload()
    } catch (err) {
      setFaceError(err.message)
    }
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
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
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
        {faceOn ? (
          <button type="button" className="btn btn-light btn-small" onClick={removeFace}>
            Turn off
          </button>
        ) : (
          <button type="button" className="btn btn-light btn-small" onClick={() => setShowCamera(!showCamera)}>
            {showCamera ? 'Cancel' : 'Set up face login'}
          </button>
        )}
      </div>
      {faceError && <p className="error">{faceError}</p>}
      {showCamera && !faceOn && (
        <div className="inline-form camera-small">
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I agree that Roomify saves an encrypted template of my face (not the photo) to log me in.
              I can turn it off at any time, and then it is deleted.
            </span>
          </label>
          {consent && <FaceCamera loading={checking} onVerify={saveFace} buttonText="Save my face" />}
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
      <button type="button" className="btn btn-light" onClick={() => { logout(); navigate('/') }}>
        Log out
      </button>
    </section>
  )
}
