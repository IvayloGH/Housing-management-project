import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatusDot from '../components/StatusDot.jsx'
import { technicianInfo, jobs, workHistory, updateJob } from '../data/mockData.js'
import { todayText } from '../utils/dateText.js'

function TechnicianWorkPage() {
  // The jobs that are accepted or in progress (not new and not fixed yet)
  const [requests, setRequests] = useState(jobs.filter((j) => j.status !== 'New' && j.status !== 'Fixed'))
  const [selectedId, setSelectedId] = useState(requests.length > 0 ? requests[0].id : null)
  const [history, setHistory] = useState(workHistory)

  // The "Add finished work" form
  const [fixed, setFixed] = useState(true)
  const [date, setDate] = useState(todayText())
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const selected = requests.find((r) => r.id === selectedId)

  function handleSave(event) {
    event.preventDefault()
    if (text.trim() === '') {
      setError('Write what you did.')
      return
    }

    // The date input gives text like "2026-11-24". Turn it into "Tue 24 Nov".
    const parts = date.split('-')
    const fixDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    const dateLabel = fixDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

    const entry = {
      id: Date.now(),
      date: dateLabel,
      title: selected.title,
      place: selected.place,
      text: text.trim(),
      fixed: fixed,
    }
    setHistory([entry, ...history])

    // Fixed: the job is done, so it leaves the list of requests
    if (fixed) {
      updateJob(selected.id, selected.when, 'Fixed')
      const rest = requests.filter((r) => r.id !== selected.id)
      setRequests(rest)
      setSelectedId(rest.length > 0 ? rest[0].id : null)
    }

    setText('')
    setError('')
  }

  return (
    <>
      <PageHeader eyebrow={`Technician · ${technicianInfo.name} · Work done`} title="What you've fixed." />

      <div className="page-body">
        <h2 className="section-title">Requests</h2>
        {requests.length > 0 && (
          <div className="grid-3">
            {requests.map((r) => (
              <button
                key={r.id}
                className={r.id === selectedId ? 'select-card selected' : 'select-card'}
                onClick={() => setSelectedId(r.id)}
              >
                <span className="row-top">
                  <strong>{r.title}</strong>
                  <span className={'urgency urgency-' + r.urgency.toLowerCase()}>{r.urgency}</span>
                </span>
                <span className="row-sub">{r.place}</span>
                <span className="small-strong">{r.status} · {r.when.toLowerCase()}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid-work">
          <form className="card" onSubmit={handleSave}>
            <h2>Add finished work</h2>

            {!selected && <p className="row-sub">All your jobs are done.</p>}

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
                  <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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

                {error && <p className="error">{error}</p>}
                <button type="submit" className="btn btn-full">Save</button>
              </>
            )}
          </form>

          <section className="card">
            <h2>Work history</h2>
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
