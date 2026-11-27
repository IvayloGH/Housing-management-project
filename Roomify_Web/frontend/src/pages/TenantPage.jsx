import { useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import StatusDot from '../components/StatusDot.jsx'
import ReportStatus from '../components/ReportStatus.jsx'
import Icon from '../components/Icon.jsx'
import tenantPhoto from '../assets/building.jpg'
import { useApi } from '../api/useApi.js'
import { useUser } from '../api/userContext.js'
import { getHouseTickets, getMyChores, getGroceries, markChoreDone } from '../api/roomify.js'
import { toReport } from '../api/convert.js'
import { fromDateText } from '../utils/dates.js'

// Everything the home page needs, loaded at the same time
async function loadHome() {
  const [chores, groceries, tickets] = await Promise.all([getMyChores(3), getGroceries(), getHouseTickets()])
  return { chores, groceries, tickets }
}

function TenantPage() {
  const { user: profile } = useUser()
  const { data, error, reload } = useApi(loadHome)
  const [actionError, setActionError] = useState('')
  // The button that is being saved right now, e.g. 'chore-12' (so it can't be clicked twice)
  const [busy, setBusy] = useState('')

  async function run(key, action) {
    setActionError('')
    setBusy(key)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(err.message)
    }
    setBusy('')
  }

  const chores = data ? data.chores : []
  const items = data ? data.groceries.filter((g) => !g.is_bought).slice(0, 4) : []
  const myReports = data
    ? data.tickets.map((t) => toReport(t, profile.user_id)).filter((r) => r.mine && r.status !== 'fixed')
    : []

  return (
    <>
      <PageHeader
        eyebrow={`Tenant · ${profile.house_name || ''} · Room ${profile.room_number || '-'}`}
        title="Your house today."
        titleMuted="Chores, groceries and repairs in one place."
        image={tenantPhoto}
      >
        <Link to="/tenant/schedule" className="btn">View cleaning schedule</Link>
        <Link to="/tenant/report" className="btn btn-light">Report a problem</Link>
        <Link to="/tenant/groceries" className="btn btn-ghost">Groceries</Link>
      </PageHeader>

      <div className="page-body">
        {(error || actionError) && <p className="error">{error || actionError}</p>}

        <h2 className="section-title">To do</h2>
        <div className="grid-2">
          <section className="card">
            <div className="card-head">
              <h2>Your chores</h2>
              <Link to="/tenant/schedule" className="card-link">Full schedule</Link>
            </div>
            {data && chores.length === 0 && <p className="row-sub">No chores for you. Enjoy!</p>}
            {chores.map((chore, index) => {
              const due = fromDateText(chore.due_date)
              return (
                <div className="list-row" key={chore.assignment_id}>
                  <div className="row-left">
                    <div className={'date-box' + (index === 0 ? ' highlight' : '')}>
                      <span>{due.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                      <strong>{due.getDate()}</strong>
                    </div>
                    <div>
                      <strong>{chore.chore_title}</strong>
                      <p className="row-sub">{chore.status === 'MISSED' ? 'Not done yet' : chore.area || ''}</p>
                    </div>
                  </div>
                  {index === 0 && (
                    <button
                      className="btn btn-small"
                      disabled={busy !== ''}
                      onClick={() => run('chore-' + chore.assignment_id, () => markChoreDone(chore.assignment_id))}
                    >
                      {busy === 'chore-' + chore.assignment_id ? 'Saving…' : 'Mark as done'}
                    </button>
                  )}
                </div>
              )
            })}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Household supplies</h2>
              <Link to="/tenant/groceries" className="card-link">See shared groceries</Link>
            </div>
            {data && items.length === 0 && (
              <p className="saved"><Icon name="check" /> Nothing on the shopping list</p>
            )}
            {items.map((item) => (
              <div className="list-row" key={item.item_id}>
                <strong>{item.name}</strong>
                <div className="row-right">
                  <StatusDot color="orange">To buy</StatusDot>
                </div>
              </div>
            ))}
          </section>
        </div>

        <h2 className="section-title">Repairs</h2>
        <section className="card">
          <div className="card-head">
            <h2>Maintenance</h2>
            <Link to="/tenant/report" className="card-link">Report a problem</Link>
          </div>
          {data && myReports.length === 0 && <p className="row-sub">You have no open reports.</p>}
          {myReports.map((report) => (
            <div className="list-row" key={report.id}>
              <div>
                <strong>{report.title}</strong>
                <p className="row-sub">{report.room} · reported {report.posted.toLowerCase()}</p>
              </div>
              <ReportStatus report={report} />
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

export default TenantPage
