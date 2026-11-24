import { useState } from 'react'
import { useSearchParams } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import Icon from '../components/Icon.jsx'
import PhotoView from '../components/PhotoView.jsx'
import { reports, technicians, assignReport, removeReport } from '../data/mockData.js'

const categories = ['Plumbing', 'Electrical', 'Heating', 'Cleaning', 'Small repairs', 'Other']
const doneByOptions = ['As soon as possible', 'Today', 'This week', 'Next week']

// The category of a report, or 'Other' if it is not in our list
function categoryOf(report) {
  if (categories.includes(report.category)) {
    return report.category
  }
  return 'Other'
}

function ManagerReviewPage() {
  // The address can say which report to open, e.g. /manager/review?report=2
  const [searchParams] = useSearchParams()
  const askedId = Number(searchParams.get('report'))

  // The reports that wait for the manager (plus the asked one, if it is already in progress)
  const waiting = reports.filter((r) => r.status === 'waiting' || r.id === askedId)
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
  const [search, setSearch] = useState(first && first.technician ? first.technician : '')
  const [technician, setTechnician] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const selected = list.find((r) => r.id === selectedId)
  // Show 3 cards, or all of them after "See all"
  const shownCards = showAll ? list : list.slice(0, 3)

  // Technicians whose name matches what you type (only while no one is chosen yet)
  let suggestions = []
  if (search !== '' && technician === '') {
    suggestions = technicians.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
  }

  // Select a report and fill the form with its information
  function selectReport(report) {
    setSelectedId(report.id)
    setUrgency(report.urgency)
    setCategory(categoryOf(report))
    setDoneBy(doneByOptions[0])
    setSearch(report.technician || '')
    setTechnician('')
    setNote('')
    setError('')
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

  function handleSave(event) {
    event.preventDefault()
    if (technician === '') {
      setError('Choose a technician from the list.')
      return
    }
    const firstName = technician.split(' ')[0]
    assignReport(selected.id, firstName, urgency, category)
    finish(selected.title + ' is sent to ' + technician)
  }

  function handleDecline() {
    removeReport(selected.id)
    finish(selected.title + ' is declined')
  }

  return (
    <>
      <PageHeader
        eyebrow="Property manager · Review & assign"
        title="Send the right technician."
        titleMuted="Check the report, then choose who goes and when."
      />

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
                onClick={() => { selectReport(r); setMessage('') }}
              >
                <span className="row-top">
                  <strong>{r.title}</strong>
                  <span className={'urgency urgency-' + r.urgency.toLowerCase()}>{r.urgency}</span>
                </span>
                <span className="row-sub">{r.house} · {r.room} · {r.posted.toLowerCase()}</span>
                <span className="not-assigned">
                  {r.technician ? r.technician + ' · in progress' : 'Not assigned yet'}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="grid-2">
            {/* ---------- Left: what the tenant sent ---------- */}
            <section className="card">
              <h2>What the tenant sent</h2>
              <PhotoView src={selected.photo} alt={'Photo of: ' + selected.title} />
              <p className="tenant-text">{selected.description}</p>
              <div className="detail-row"><span>Where</span><strong>{selected.house} · {selected.room}</strong></div>
              <div className="detail-row"><span>Reported by</span><strong>{selected.reportedBy}, {selected.posted.toLowerCase()}</strong></div>
              <div className="detail-row"><span>Category</span><strong>{selected.category}</strong></div>
            </section>

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
                      setTechnician('')
                      setError('')
                    }}
                  />
                </span>
                {suggestions.length > 0 && (
                  <ul className="suggestions">
                    {suggestions.map((t) => (
                      <li key={t.id}>
                        <button type="button" onClick={() => { setTechnician(t.name); setSearch(t.name) }}>
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
                <button type="button" className="btn btn-light" onClick={handleDecline}>Decline report</button>
                <button type="submit" className="btn">Save</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}

export default ManagerReviewPage
