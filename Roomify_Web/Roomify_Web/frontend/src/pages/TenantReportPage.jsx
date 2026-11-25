import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatusDot from '../components/StatusDot.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import Icon from '../components/Icon.jsx'
import PhotoView from '../components/PhotoView.jsx'
import { useApi } from '../api/useApi.js'
import { getHouseTickets, getProfile, reportProblem, uploadPhoto } from '../api/roomify.js'
import { toReport, urgencyCode } from '../api/convert.js'

const rooms = ['Kitchen', 'Bathroom 1', 'Bathroom 2', 'Hallway', 'Living room', 'My room']

// The coloured dot and text for the status of a report
function ReportStatus({ report }) {
  if (report.status === 'waiting') {
    return <StatusDot color="orange">Waiting for the manager</StatusDot>
  }
  if (report.status === 'inProgress') {
    return <StatusDot color="green">In progress · {report.technician}</StatusDot>
  }
  return <StatusDot color="grey">Fixed by {report.technician}</StatusDot>
}

async function loadReports() {
  const [profile, tickets] = await Promise.all([getProfile(), getHouseTickets()])
  return { profile, tickets }
}

function TenantReportPage() {
  const { data, error: loadError, reload } = useApi(loadReports)
  const [room, setRoom] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null) // temporary web address, to show the photo
  const [photoFile, setPhotoFile] = useState(null) // the file itself, to upload
  const [urgency, setUrgency] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Only the reports of this tenant
  const myReports = data ? data.tickets.map((t) => toReport(t, data.profile.user_id)).filter((r) => r.mine) : []

  function handlePhoto(event) {
    const file = event.target.files[0]
    if (file) {
      // Makes a temporary web address for the photo, so we can show it on the page
      setPhoto(URL.createObjectURL(file))
      setPhotoFile(file)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (room === '' || description.trim() === '' || urgency === '') {
      setError('Choose a room, describe the problem and pick the urgency.')
      return
    }

    setSending(true)
    setError('')
    try {
      const ticket = await reportProblem({
        // The title is the first sentence of the description (max. 40 letters)
        title: description.trim().split('.')[0].slice(0, 40),
        description: description.trim(),
        location: room,
        category: 'Other', // the manager picks the real category
        urgency: urgencyCode[urgency],
      })
      if (photoFile) await uploadPhoto(ticket.ticket_id, photoFile)

      // Empty the form again
      setRoom('')
      setDescription('')
      setPhoto(null)
      setPhotoFile(null)
      setUrgency('')
      setSent(true)
      reload()
    } catch (err) {
      setError(err.message)
    }
    setSending(false)
  }

  return (
    <>
      <PageHeader
        eyebrow={`Tenant · Report a problem${data ? ' · ' + data.profile.house_name : ''}`}
        title="Something broken? Tell us."
      />

      <div className="page-body">
        {loadError && <p className="error">{loadError}</p>}

        <div className="grid-report">
          <form className="card" onSubmit={handleSubmit}>
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="step-row">
              <span className="step-number">3</span>
              <div>
                <h3>Add a photo <span className="optional">(optional, jpg or png, max 5 MB)</span></h3>
                <label className="btn btn-light btn-small file-button">
                  <Icon name="camera" /> Take or upload a photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={handlePhoto}
                    hidden
                  />
                </label>
                {photo && <img src={photo} alt="Your photo of the problem" className="photo-preview" />}
              </div>
            </div>

            <div className="urgency-row">
              <span className="label-small">Urgency</span>
              <ChipGroup options={['Low', 'Medium', 'Urgent']} value={urgency} onChange={setUrgency} size="chips-small" />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="card-footer no-line">
              <button type="submit" className="btn" disabled={sending}>
                {sending ? 'Sending…' : 'Send report'}
              </button>
              {sent && <span className="saved"><Icon name="check" /> Sent to the property manager</span>}
            </div>
          </form>

          <section className="card">
            <h2>Recent reports</h2>
            {data && myReports.length === 0 && <p className="row-sub">You haven't reported anything yet.</p>}
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
