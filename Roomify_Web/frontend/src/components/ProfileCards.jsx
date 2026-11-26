import { useState } from 'react'
import FaceCamera from './FaceCamera.jsx'
import Icon from './Icon.jsx'
import { useApi } from '../api/useApi.js'
import { changePassword, getFaceStatus, setupFace, turnOffFace, updateProfile } from '../api/roomify.js'
import { rolePage } from '../api/convert.js'
import { useUser } from '../api/userContext.js'
import { FACE_LOGIN_ENABLED } from '../config.js'

// Cards that are used on the profile page of every role

// "Personal details": name and email, saved in the backend
export function PersonalDetailsCard({ title = 'Personal details' }) {
  const { user, setUser } = useUser()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const profile = await updateProfile({ name: name.trim(), email: email.trim() })
      // Share the new name with the rest of the app (header texts etc.)
      setUser({ ...profile, role: rolePage(profile.role) })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <section className="card">
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
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          {saved && <span className="saved"><Icon name="check" /> Saved</span>}
        </div>
      </form>
    </section>
  )
}

// "Your home": the tenant's house and room
export function AddressCard() {
  const { user } = useUser()
  return (
    <section className="card">
      <h2>Your home</h2>
      <div className="detail-row"><span>House</span><strong>{user.house_name || '-'}</strong></div>
      <div className="detail-row"><span>Room</span><strong>{user.room_number || '-'}</strong></div>
      <p className="row-sub">Moving to another house? Ask your property manager.</p>
    </section>
  )
}

// "Password and sign-in": change password and (when it works in the backend) face login
export function SignInCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [saving, setSaving] = useState(false)

  async function savePassword(event) {
    event.preventDefault()
    if (newPassword.length < 8) {
      setPasswordError('Your password needs at least 8 characters')
      return
    }
    setSaving(true)
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
    setSaving(false)
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
              autoComplete="current-password"
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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          {passwordError && <p className="error">{passwordError}</p>}
          <button type="submit" className="btn btn-small" disabled={saving}>
            {saving ? 'Saving…' : 'Save password'}
          </button>
        </form>
      )}

      {/* Hidden until face login works in the backend (see config.js) */}
      {FACE_LOGIN_ENABLED && <FaceLoginSetting />}
    </section>
  )
}

// Turn face login on or off
function FaceLoginSetting() {
  const [showCamera, setShowCamera] = useState(false)
  const [checking, setChecking] = useState(false)
  const [consent, setConsent] = useState(false)
  const [faceError, setFaceError] = useState('')
  const face = useApi(getFaceStatus)
  const faceOn = face.data ? face.data.is_set_up : false

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
    <>
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
      {(faceError || face.error) && <p className="error">{faceError || face.error}</p>}
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
    </>
  )
}

// "Log out"
export function LogoutCard() {
  const { signOut } = useUser()
  return (
    <section className="card card-row">
      <h2>Log out</h2>
      <button type="button" className="btn btn-light" onClick={signOut}>
        Log out
      </button>
    </section>
  )
}
