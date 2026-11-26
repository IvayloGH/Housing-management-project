import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import Icon from '../components/Icon.jsx'
import PhotoView from '../components/PhotoView.jsx'
import { useApi } from '../api/useApi.js'
import { addNote, assignTicket, declineTicket, getManagerTickets, getTeam, updateTicket } from '../api/roomify.js'
import { toReport, urgencyCode } from '../api/convert.js'

const categories = ['Plumbing', 'Electrical', 'Heating', 'Cleaning', 'Small repairs', 'Other']
const doneByOptions = ['As soon as possible', 'Today', 'This week', 'Next week']

// The category of a report, or 'Other' if it is not in our list
function categoryOf(report) {
  if (categories.includes(report.category)) {
    return report.category
  }
  return 'Other'
}

async function loadReview() {
  const [tickets, team] = await Promise.all([getManagerTickets(), getTeam()])
  return {
    reports: tickets.map((t) => toReport(t)),
    technicians: team.map((t) => ({ id: t.user_id, name: t.name, skills: t.specialty || '' })),
  }
}

const header = (
  <PageHeader
    eyebrow="Property manager · Review & assign"
    title="Send the right technician."
    titleMuted="Check the report, then choose who goes and when."
  />
)

// Loads the reports first, then shows the review screen
function ManagerReviewPage() {
  const { data, error } = useApi(loadReview)
  const [searchParams] = useSearchParams()
  const askedId = Number(searchParams.get('report'))

  if (!data) {
    return (
      <>
        {header}
        <div className="page-body">{error ? <p className="error">{error}</p> : <p className="row-sub">Loading…</p>}</div>
      </>
    )
  }

  // A report that is already assigned or fixed (the "Open" button on the overview):
  // only show it. Assigning it again would set an in-progress job back to "new".
  const asked = data.reports.find((r) => r.id === askedId)
  if (asked && asked.status !== 'waiting') {
    return (
      <>
        {header}
        <div className="page-body">
          <ReportDetails report={asked} />
        </div>
      </>
    )
  }

  return <ReviewScreen reports={data.reports} technicians={data.technicians} askedId={askedId} />
}

// What the tenant sent (left card on the review screen, or the whole page for an assigned report)
function TenantReport({ report }) {
  return (
    <section className="card">
      <h2>What the tenant sent</h2>
      <PhotoView src={report.photo} alt={'Photo of: ' + report.title} />
      <p className="tenant-text">{report.description}</p>
      <div className="detail-row"><span>Where</span><strong>{report.house} · {report.room}</strong></div>
      <div className="detail-row"><span>Reported by</span><strong>{report.reportedBy}, {report.posted.toLowerCase()}</strong></div>
      <div className="detail-row"><span>Category</span><strong>{report.category}</strong></div>
    </section>
  )
}

// Read-only view of a report that is assigned or fixed
function ReportDetails({ report }) {
  return (
    <>
      <div className="calendar-top">
        <h2 className="section-title">{report.title}</h2>
        <Link to="/manager" className="link-button">Back to overview</Link>
      </div>
      <div className="grid-2">
        <TenantReport report={report} />
        <section className="card">
          <h2>{report.status === 'fixed' ? 'Fixed' : 'In progress'}</h2>
          <div className="detail-row"><span>Technician</span><strong>{report.technicianFullName || '-'}</strong></div>
          <div className="detail-row">
            <span>Urgency</span>
            <strong className={'urgency urgency-' + report.urgency.toLowerCase()}>{report.urgency}</strong>
          </div>
          <div className="detail-row"><span>Newest note</span><strong>{report.lastNote || '-'}</strong></div>
        </section>
      </div>
    </>
  )
}

function ReviewScreen({ reports, technicians, askedId }) {
  // The reports that wait for the manager
  const waiting = reports.filter((r) => r.status === 'waiting')
  // The report to show first: the asked one, otherwise the first one
  const first = waiting.find((r) => r.id === askedId) || waiting[0]

  const [list, setList] = useState(waiting)
  const [selectedId, setSelectedId] = useState(first ? first.id : null)
  const [showAll, setShowAll] = useState(false)
  const [message, setMessage] = useState('')

  // The "Assign it" form, filled in with the selected report
  const [urgency, setUrgency] = useState(first ? first.urgency : 'Low')
  const [category, setCategory] = useState(first ? categoryOf(first) : 'Other')
  const [doneBy, setDoneBy] = useState(doneByOptions[0])
  const [search, setSearch] = useState('')
  const [technicianId, setTechnicianId] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)
  // Which steps of "Save" already worked per report, so a retry doesn't repeat them
  // (e.g. the note was saved but assigning failed: don't add the note again)
  const progress = useRef({})

  const selected = list.find((r) => r.id === selectedId)
  // Show 3 cards, or all of them after "See all"
  const shownCards = showAll ? list : list.slice(0, 3)

  // Technicians whose name matches what you type (only while no one is chosen yet)
  let suggestions = []
  if (search !== '' && technicianId === null) {
    suggestions = technicians.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
  }

  // Select a report and fill the form with its information
  function selectReport(report) {
    setSelectedId(report.id)
    setUrgency(report.urgency)
    setCategory(categoryOf(report))
    setDoneBy(doneByOptions[0])
    setSearch('')
    setTechnicianId(null)
    setNote('')
    setError('')
    setConfirmDecline(false)
  }

  // The manager is done with this report: take it out of the list and select the next one
  function finish(text) {
    const rest = list.filter((r) => r.id !== selected.id)
    setList(rest)
    if (rest.length > 0) {
      selectReport(rest[0])
    } else {
      setSelectedId(null)
    }
    setMessage(text)
  }

  async function handleSave(event) {
    event.preventDefault()
    const chosen = technicians.find((t) => t.id === technicianId)
    if (!chosen) {
      setError('Choose a technician from the list.')
      return
    }
    setSaving(true)
    setError('')
    const id = selected.id
    const changes = { urgency: urgencyCode[urgency], category }
    // There is no date column yet, so "Done by" goes to the technician as a note
    const noteText = 'Done by: ' + doneBy + (note.trim() ? '\n' + note.trim() : '')
    const done = progress.current[id] || {}
    progress.current[id] = done
    try {
      if (JSON.stringify(done.changes) !== JSON.stringify(changes)) {
        await updateTicket(id, changes)
        done.changes = changes
      }
      if (done.note !== noteText) {
        await addNote(id, noteText)
        done.note = noteText
      }
      await assignTicket(id, chosen.id)
      delete progress.current[id]
      finish(selected.title + ' is sent to ' + chosen.name)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleDecline() {
    setSaving(true)
    try {
      await declineTicket(selected.id)
      finish(selected.title + ' is declined')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
    setConfirmDecline(false)
  }

  return (
    <>
      {header}

      <div className="page-body">
        <div className="calendar-top">
          <h2 className="section-title">Waiting for review</h2>
          {list.length > 3 && (
            <button className="link-button" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show less' : 'See all (' + list.length + ')'}
            </button>
          )}
        </div>

        {message && <p className="saved message"><Icon name="check" /> {message}</p>}

        {list.length === 0 && (
          <section className="card">
            <h2>All reports are assigned.</h2>
          </section>
        )}

        {/* The report cards to choose from */}
        {list.length > 0 && (
          <div className="grid-3">
            {shownCards.map((r) => (
              <button
                key={r.id}
                className={r.id === selectedId ? 'select-card selected' : 'select-card'}
                aria-pressed={r.id === selectedId}
                onClick={() => { selectReport(r); setMessage('') }}
              >
                <span className="row-top">
                  <strong>{r.title}</strong>
                  <span className={'urgency urgency-' + r.urgency.toLowerCase()}>{r.urgency}</span>
                </span>
                <span className="row-sub">{r.house} · {r.room} · {r.posted.toLowerCase()}</span>
                <span className="not-assigned">Not assigned yet</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="grid-2">
            {/* ---------- Left: what the tenant sent ---------- */}
            <TenantReport report={selected} />

            {/* ---------- Right: assign a technician ---------- */}
            <form className="card assign-card" onSubmit={handleSave}>
              <h2>Assign it</h2>

              <div className="field">
                <label>Urgency</label>
                <ChipGroup options={['Low', 'Medium', 'Urgent']} value={urgency} onChange={setUrgency} size="chips-wide" />
              </div>

              <div className="form-grid even">
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="doneby">Done by</label>
                  <select id="doneby" value={doneBy} onChange={(e) => setDoneBy(e.target.value)}>
                    {doneByOptions.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="field search-field">
                <label htmlFor="technician">Technician</label>
                <span className="search-wrap">
                  <Icon name="search" className="search-icon" />
                  <input
                    id="technician"
                    placeholder="Start typing a name…"
                    className="search-input"
                    autoComplete="off"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setTechnicianId(null)
                      setError('')
                    }}
                  />
                </span>
                {suggestions.length > 0 && (
                  <ul className="suggestions">
                    {suggestions.map((t) => (
                      <li key={t.id}>
                        <button type="button" onClick={() => { setTechnicianId(t.id); setSearch(t.name) }}>
                          <strong>{t.name}</strong>
                          <span className="row-sub">{t.skills}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="field">
                <label htmlFor="note">Note for the technician <span className="optional">(optional)</span></label>
                <textarea
                  id="note"
                  rows="3"
                  placeholder="Anything they should know before they go."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {error && <p className="error">{error}</p>}

              <div className="assign-buttons">
                {confirmDecline ? (
                  <>
                    <span className="row-sub">Decline and delete this report?</span>
                    <button type="button" className="btn btn-light" disabled={saving} onClick={handleDecline}>
                      Yes, decline
                    </button>
                    <button type="button" className="link-button" onClick={() => setConfirmDecline(false)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-light" disabled={saving} onClick={() => setConfirmDecline(true)}>
                      Decline report
                    </button>
                    <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                  </>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}

export default ManagerReviewPage
