import { useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApi } from '../api/useApi.js'
import { getHouses, getManagerTickets } from '../api/roomify.js'
import { toReport } from '../api/convert.js'

async function loadOverview() {
  const [tickets, houses] = await Promise.all([getManagerTickets(), getHouses()])
  return { reports: tickets.map((t) => toReport(t)), houses }
}

function ManagerPage() {
  const { data, error } = useApi(loadOverview)
  const [house, setHouse] = useState('All houses')

  const reports = data ? data.reports : []
  const houses = data ? data.houses : []

  // Only open reports, filtered on the chosen house
  const openReports = reports.filter(
    (r) => r.status !== 'fixed' && (house === 'All houses' || r.house === house)
  )
  const urgent = openReports.filter((r) => r.urgency === 'Urgent').length
  const waiting = openReports.filter((r) => r.status === 'waiting').length
  const inProgress = openReports.filter((r) => r.status === 'inProgress').length

  return (
    <>
      <PageHeader
        eyebrow="Property manager · Overview"
        title="Repairs in your houses."
        titleMuted="Newest reports at the top."
        side={
          <ChipGroup
            options={['All houses', ...houses.map((h) => h.name)]}
            value={house}
            onChange={setHouse}
          />
        }
      />

      <div className="page-body">
        {error && <p className="error">{error}</p>}

        <div className="grid-3">
          <StatCard color="red" label="Urgent" number={urgent} />
          <StatCard color="orange" label="Waiting to be assigned" number={waiting} />
          <StatCard color="green" label="In progress" number={inProgress} />
        </div>

        <section className="card">
          <h2>All reports</h2>
          {data && openReports.length === 0 && <p className="row-sub">No open reports. Everything is fixed.</p>}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Urgency</th>
                  <th>Problem</th>
                  <th>Location</th>
                  <th>Posted</th>
                  <th>Status</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {openReports.map((r) => (
                  <tr key={r.id}>
                    <td><span className={'urgency urgency-' + r.urgency.toLowerCase()}>{r.urgency}</span></td>
                    <td>
                      <strong>{r.title}</strong>
                      <p className="row-sub">{r.category}</p>
                    </td>
                    <td>{r.house} · {r.room}</td>
                    <td className="muted">{r.posted} · {r.reportedBy}</td>
                    <td>{r.status === 'waiting' ? 'Waiting' : `${r.technician} · in progress`}</td>
                    <td className="right">
                      <Link
                        to={'/manager/review?report=' + r.id}
                        className={'btn btn-small' + (r.status === 'waiting' ? '' : ' btn-light')}
                      >
                        {r.status === 'waiting' ? 'Review' : 'Open'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}

export default ManagerPage
