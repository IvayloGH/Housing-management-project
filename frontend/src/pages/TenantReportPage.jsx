import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatusDot from '../components/StatusDot.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import Icon from '../components/Icon.jsx'
import PhotoView from '../components/PhotoView.jsx'
import { tenantInfo, reports, addReport } from '../data/mockData.js'

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

function TenantReportPage() {
  const [room, setRoom] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
  const [urgency, setUrgency] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  // Only the reports of this tenant
  const [myReports, setMyReports] = useState(reports.filter((r) => r.mine))

  function handlePhoto(event) {
    const file = event.target.files[0]
    if (file) {
      // Makes a temporary web address for the photo, so we can show it on the page
      setPhoto(URL.createObjectURL(file))
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (room === '' || description.trim() === '' || urgency === '') {
      setError('Choose a room, describe the problem and pick the urgency.')
      return
    }

    const report = {
      id: Date.now(), // the current time in milliseconds: a simple unique number
      // The title is the first sentence of the description (max. 40 letters)
      title: description.trim().split('.')[0].slice(0, 40),
      category: 'Other',
      house: 'Kerkstraat 12',
      room: room,
      urgency: urgency,
      status: 'waiting',
      reportedBy: 'You',
      posted: 'Just now',
      technician: null,
      description: description.trim(),
      photo: photo,
      mine: true,
    }

    // Add it to the shared fake data too, so the manager can see it
    addReport(report)
    setMyReports([report, ...myReports])

    // Empty the form again
    setRoom('')
    setDescription('')
    setPhoto(null)
    setUrgency('')
    setError('')
    setSent(true)
  }

  return (
    <>
      <PageHeader
        eyebrow={`Tenant · Report a problem · ${tenantInfo.house}`}
        title="Something broken? Tell us."
      />

      <div className="page-body">
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
                <h3>Add a photo <span className="optional">(optional)</span></h3>
                <label className="btn btn-light btn-small file-button">
                  <Icon name="camera" /> Take or upload a photo
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} hidden />
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
              <button type="submit" className="btn">Send report</button>
              {sent && <span className="saved"><Icon name="check" /> Sent to the property manager</span>}
            </div>
          </form>

          <section className="card">
            <h2>Recent reports</h2>
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
