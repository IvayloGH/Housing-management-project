import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatusDot from '../components/StatusDot.jsx'
import { todayText } from '../utils/dateText.js'
import { useApi } from '../api/useApi.js'
import { addNote, getMyJobs, getProfile, setJobStatus } from '../api/roomify.js'
import { firstName, toJob } from '../api/convert.js'

// What the technician writes is saved as a ticket note: "Tue 24 Nov · Replaced the drain seal".
// The work history reads the date back from the start of that note.
const SEPARATOR = ' · '

function historyOf(tickets) {
  const rows = []
  for (const ticket of tickets) {
    const note = ticket.last_note || ''
    const at = note.indexOf(SEPARATOR)
    // Only notes written on this page (they start with a date like "Tue 24 Nov")
    if (at > 0 && /^\w{3} \d{1,2} \w{3}$/.test(note.slice(0, at))) {
      const job = toJob(ticket)
      rows.push({
        id: job.id,
        date: note.slice(0, at),
        title: job.title,
        place: job.place,
        text: note.slice(at + SEPARATOR.length),
        fixed: ticket.status === 'RESOLVED',
      })
    }
  }
  return rows
}

async function loadWork() {
  const [profile, tickets] = await Promise.all([getProfile(), getMyJobs()])
  return { name: firstName(profile.name), tickets }
}

function TechnicianWorkPage() {
  const { data, error, reload } = useApi(loadWork)
  const [selectedId, setSelectedId] = useState(null)

  // The "Add finished work" form
  const [fixed, setFixed] = useState(true)
  const [date, setDate] = useState(todayText())
  const [text, setText] = useState('')
  const [formError, setFormError] = useState('')

  const tickets = data ? data.tickets : []
  // The jobs that are not fixed yet
  const requests = tickets.filter((t) => t.status !== 'RESOLVED').map(toJob)
  const history = historyOf(tickets)
  const selected = requests.find((r) => r.id === selectedId) || requests[0]

  async function handleSave(event) {
    event.preventDefault()
    if (text.trim() === '') {
      setFormError('Write what you did.')
      return
    }

    // The date input gives text like "2026-11-24". Turn it into "Tue 24 Nov".
    const parts = date.split('-')
    const fixDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    const dateLabel = fixDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

    try {
      await addNote(selected.id, dateLabel + SEPARATOR + text.trim())
      if (fixed) {
        // Fixed: the job is done, so it leaves the list of requests
        await setJobStatus(selected.id, 'RESOLVED')
      } else if (selected.status === 'New') {
        await setJobStatus(selected.id, 'IN_PROGRESS')
      }
      setText('')
      setFormError('')
      setSelectedId(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    }
  }

  return (
    <>
      <PageHeader eyebrow={`Technician · ${data ? data.name : ''} · Work done`} title="What you've fixed." />

      <div className="page-body">
        {error && <p className="error">{error}</p>}

        <h2 className="section-title">Requests</h2>
        {requests.length > 0 && (
          <div className="grid-3">
            {requests.map((r) => (
              <button
                key={r.id}
                className={selected && r.id === selected.id ? 'select-card selected' : 'select-card'}
                onClick={() => setSelectedId(r.id)}
              >
                <span className="row-top">
                  <strong>{r.title}</strong>
                  <span className={'urgency urgency-' + r.urgency.toLowerCase()}>{r.urgency}</span>
                </span>
                <span className="row-sub">{r.place}</span>
                <span className="small-strong">{r.status}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid-work">
          <form className="card" onSubmit={handleSave}>
            <h2>Add finished work</h2>

            {data && !selected && <p className="row-sub">All your jobs are done.</p>}

            {selected && (
              <>
                <div className="job-box">
                  <span className="row-sub">Job</span>
                  <strong>{selected.title}</strong>
                  <span className="row-sub">{selected.place}</span>
                </div>

                <div className="field">
                  <label>Is it fixed?</label>
                  <div className="chips">
                    <button type="button" className={fixed ? 'chip selected' : 'chip'} onClick={() => setFixed(true)}>
                      Yes, it's fixed
                    </button>
                    <button type="button" className={!fixed ? 'chip selected' : 'chip'} onClick={() => setFixed(false)}>
                      Not yet, I need to come back
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="date">When did you fix it?</label>
                  <input id="date" type="date" max={todayText()} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                <div className="field">
                  <label htmlFor="what">What did you do?</label>
                  <textarea
                    id="what"
                    rows="3"
                    placeholder="e.g. Replaced the drain seal"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>

                {formError && <p className="error">{formError}</p>}
                <button type="submit" className="btn btn-full">Save</button>
              </>
            )}
          </form>

          <section className="card">
            <h2>Work history</h2>
            {data && history.length === 0 && <p className="row-sub">Nothing saved yet.</p>}
            {history.map((h) => (
              <div className="history-row" key={h.id}>
                <strong className="history-date">{h.date}</strong>
                <div>
                  <strong>{h.title}</strong>
                  <p className="row-sub">{h.place}</p>
                  <p className="history-text">{h.text}</p>
                </div>
                <StatusDot color={h.fixed ? 'green' : 'orange'}>
                  {h.fixed ? 'Fixed' : 'Needs another visit'}
                </StatusDot>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  )
}

export default TechnicianWorkPage
