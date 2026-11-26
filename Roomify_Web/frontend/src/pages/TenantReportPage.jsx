import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ReportStatus from '../components/ReportStatus.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import Icon from '../components/Icon.jsx'
import PhotoView from '../components/PhotoView.jsx'
import { useApi } from '../api/useApi.js'
import { useUser } from '../api/userContext.js'
import { getHouseTickets, reportProblem, uploadPhoto } from '../api/roomify.js'
import { toReport, urgencyCode } from '../api/convert.js'


// The same rules as the backend (routers/tickets.py), so we can say it before uploading
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

// The title of a report: its first sentence (max. 40 letters).
// "e.g." or a dot at the start would give an empty title, so then use the start of the text.
function makeTitle(description, room) {
  const text = description.trim()
  const firstSentence = text.split(/[.!?](?:\s|$)|\n/)[0].trim()
  const title = (firstSentence.length >= 4 ? firstSentence : text).slice(0, 40).trim()
  return title || 'Problem in ' + room
}

function TenantReportPage() {
  const { user: profile } = useUser()
  // The rooms the manager typed for this house, plus your own room
  const rooms = [...(profile.house_rooms || []), 'My room']
  const { data: tickets, error: loadError, reload } = useApi(getHouseTickets)
  const [room, setRoom] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null) // temporary web address, to show the photo
  const [photoFile, setPhotoFile] = useState(null) // the file itself, to upload
  const [urgency, setUrgency] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  // A report that is already sent, but its photo could not be added yet.
  // Pressing the button again then only tries the photo, so no second report is made.
  const [ticketWithoutPhoto, setTicketWithoutPhoto] = useState(null)

  // The temporary web address of the photo is freed when it is not shown any more
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo)
    }
  }, [photo])

  // Only the reports of this tenant
  const myReports = tickets ? tickets.map((t) => toReport(t, profile.user_id)).filter((r) => r.mine) : []

  function setPhotoTo(file) {
    setPhoto(file ? URL.createObjectURL(file) : null)
    setPhotoFile(file)
  }

  function handlePhoto(event) {
    const file = event.target.files[0]
    event.target.value = '' // so choosing the same file again also works
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('The photo must be a JPG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('The photo is bigger than 5 MB. Choose a smaller one.')
      return
    }
    setError('')
    setPhotoTo(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!ticketWithoutPhoto && (room === '' || description.trim() === '' || urgency === '')) {
      setError('Choose a room, describe the problem and pick the urgency.')
      return
    }

    setSending(true)
    setError('')
    setSent(false)
    let ticketId = ticketWithoutPhoto
    try {
      if (!ticketId) {
        const ticket = await reportProblem({
          title: makeTitle(description, room),
          description: description.trim(),
          location: room,
          category: 'Other', // the manager picks the real category
          urgency: urgencyCode[urgency],
        })
        ticketId = ticket.ticket_id
        // The report is saved: empty these fields, so it can't be sent twice
        setRoom('')
        setDescription('')
        setUrgency('')
      }

      if (photoFile) {
        try {
          await uploadPhoto(ticketId, photoFile)
        } catch (err) {
          setTicketWithoutPhoto(ticketId)
          setError(
            'Your report is sent, but the photo was not added: ' + err.message.replace(/\.?$/, '.') +
            ' Try again, choose another photo, or remove the photo to finish.',
          )
          reload()
          return
        }
      }

      setTicketWithoutPhoto(null)
      setPhotoTo(null)
      setSent(true)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  let buttonText = 'Send report'
  if (sending) buttonText = 'Sending…'
  else if (ticketWithoutPhoto) buttonText = photoFile ? 'Add the photo' : 'Finish without photo'

  return (
    <>
      <PageHeader
        eyebrow={`Tenant · Report a problem${profile.house_name ? ' · ' + profile.house_name : ''}`}
        title="Something broken? Tell us."
      />

      <div className="page-body">
        {loadError && <p className="error">{loadError}</p>}

        <div className="grid-report">
          <form className="card" onSubmit={handleSubmit}>
            {ticketWithoutPhoto ? (
              <p className="notice">Your report is sent to the property manager. Only the photo still needs to be added.</p>
            ) : (
              <>
                <div className="step-row">
                  <span className="step-number">1</span>
                  <div>
                    <h3>Where is the problem?</h3>
                    <ChipGroup options={rooms} value={room} onChange={setRoom} />
                  </div>
                </div>

                <div className="step-row">
                  <span className="step-number">2</span>
                  <div className="step-content">
                    <h3>What's wrong?</h3>
                    <textarea
                      rows="4"
                      placeholder="Describe what you see and since when."
                      aria-label="What's wrong?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="step-row">
              <span className="step-number">3</span>
              <div>
                <h3>Add a photo <span className="optional">(optional, jpg, png or webp, max 5 MB)</span></h3>
                <span className="row-actions">
                  <label className="btn btn-light btn-small file-button">
                    <Icon name="camera" /> {photo ? 'Choose another photo' : 'Take or upload a photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={handlePhoto}
                      hidden
                    />
                  </label>
                  {photo && (
                    <button type="button" className="link-button" onClick={() => setPhotoTo(null)}>
                      Remove photo
                    </button>
                  )}
                </span>
                {photo && <img src={photo} alt="Your photo of the problem" className="photo-preview" />}
              </div>
            </div>

            {!ticketWithoutPhoto && (
              <div className="urgency-row">
                <span className="label-small">Urgency</span>
                <ChipGroup options={['Low', 'Medium', 'Urgent']} value={urgency} onChange={setUrgency} size="chips-small" />
              </div>
            )}

            {error && <p className="error">{error}</p>}

            <div className="card-footer no-line">
              <button type="submit" className="btn" disabled={sending}>{buttonText}</button>
              {sent && <span className="saved"><Icon name="check" /> Sent to the property manager</span>}
            </div>
          </form>

          <section className="card">
            <h2>Recent reports</h2>
            {tickets && myReports.length === 0 && <p className="row-sub">You haven't reported anything yet.</p>}
            {myReports.map((r) => (
              <div className="list-row stacked" key={r.id}>
                {r.photo && <PhotoView src={r.photo} alt={'Photo of: ' + r.title} size="small" />}
                <div className="row-top">
                  <strong>{r.title}</strong>
                  <span className="row-sub">{r.posted}</span>
                </div>
                <p className="row-sub">
                  {r.room} · <span className={'urgency urgency-' + r.urgency.toLowerCase()}>{r.urgency}</span>{' '}
                  <ReportStatus report={r} />
                </p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  )
}

export default TenantReportPage
