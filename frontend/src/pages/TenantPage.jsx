import { useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import StatusDot from '../components/StatusDot.jsx'
import { tenantInfo, myChores, supplies, reports } from '../data/mockData.js'
import Icon from '../components/Icon.jsx'
import tenantPhoto from '../assets/photos/tenant-home.jpg'

// Colour and text for each supply status
const supplyStatus = {
  low: { color: 'orange', label: 'Running low' },
  out: { color: 'red', label: 'Out' },
  enough: { color: 'green', label: 'Enough' },
}

const reportStatus = {
  waiting: { color: 'orange', label: 'Waiting for the manager' },
  inProgress: { color: 'green', label: 'In progress' },
  fixed: { color: 'grey', label: 'Fixed' },
}

function TenantPage() {
  const [chores, setChores] = useState(myChores)
  const [items, setItems] = useState(supplies.slice(0, 4))
  const myReports = reports.filter((r) => r.mine && r.status !== 'fixed')

  function markDone(id) {
    setChores(chores.map((c) => (c.id === id ? { ...c, done: true } : c)))
  }

  function bought(id) {
    setItems(items.map((i) => (i.id === id ? { ...i, status: 'enough' } : i)))
  }

  return (
    <>
      <PageHeader
        eyebrow={`Tenant · ${tenantInfo.house} · Room ${tenantInfo.room}`}
        title="Your house today."
        titleMuted="Chores, groceries and repairs in one place."
        image={tenantPhoto}
      >
        <Link to="/tenant/schedule" className="btn">View cleaning schedule</Link>
        <Link to="/tenant/report" className="btn btn-light">Report a problem</Link>
      </PageHeader>

      <div className="page-body">
        <h2 className="section-title">To do</h2>
        <div className="grid-2">
          <section className="card">
            <div className="card-head">
              <h2>Your chores</h2>
              <Link to="/tenant/schedule" className="card-link">Full schedule</Link>
            </div>
            {chores.map((chore, index) => (
              <div className="list-row" key={chore.id}>
                <div className="row-left">
                  <div className={'date-box' + (index === 0 ? ' highlight' : '')}>
                    <span>{chore.day}</span>
                    <strong>{chore.date}</strong>
                  </div>
                  <div>
                    <strong>{chore.title}</strong>
                    <p className="row-sub">{chore.text}</p>
                  </div>
                </div>
                {chore.done ? (
                  <span className="saved"><Icon name="check" /> Done</span>
                ) : (
                  index === 0 && (
                    <button className="btn btn-small" onClick={() => markDone(chore.id)}>
                      Mark as done
                    </button>
                  )
                )}
              </div>
            ))}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Household supplies</h2>
              <Link to="/tenant/groceries" className="card-link">See shared groceries</Link>
            </div>
            {items.map((item) => (
              <div className="list-row" key={item.id}>
                <strong>{item.name}</strong>
                <div className="row-right">
                  <StatusDot color={supplyStatus[item.status].color}>
                    {supplyStatus[item.status].label}
                  </StatusDot>
                  <span className="button-space">
                    {item.status !== 'enough' && (
                      <button className="btn btn-small" onClick={() => bought(item.id)}>
                        I bought it
                      </button>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </section>
        </div>

        <h2 className="section-title">Repairs</h2>
        <section className="card">
          <div className="card-head">
            <h2>Maintenance</h2>
            <Link to="/tenant/report" className="btn btn-small">Report a problem</Link>
          </div>
          {myReports.map((report) => (
            <div className="list-row" key={report.id}>
              <div>
                <strong>{report.title}</strong>
                <p className="row-sub">{report.room} · reported {report.posted.toLowerCase()}</p>
              </div>
              <StatusDot color={reportStatus[report.status].color}>
                {reportStatus[report.status].label}
              </StatusDot>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

export default TenantPage
