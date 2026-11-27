import { useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApi } from '../api/useApi.js'
import { getHouses, getManagerTickets } from '../api/roomify.js'
import { toReport } from '../api/convert.js'

const ALL_HOUSES = 'all'

async function loadOverview() {
  const [tickets, houses] = await Promise.all([getManagerTickets(), getHouses()])
  return { reports: tickets.map((t) => toReport(t)), houses }
}

// The text in the Status column
function statusText(report) {
  if (report.status === 'waiting') return 'Waiting'
  if (report.status === 'fixed') return 'Fixed' + (report.technician ? ' by ' + report.technician : '')
  return (report.technician || 'Technician') + ' · in progress'
}

function ManagerPage() {
  const { data, error } = useApi(loadOverview)
  // The chosen house: its house_id, or 'all'. (Two houses can have the same street name,
  // so we filter on the id, not on the name.)
  const [house, setHouse] = useState(ALL_HOUSES)
  const [showFixed, setShowFixed] = useState(false)

  const reports = data ? data.reports : []
  const houses = data ? data.houses : []

  const inHouse = reports.filter((r) => house === ALL_HOUSES || r.houseId === house)
  const openReports = inHouse.filter((r) => r.status !== 'fixed')
  const shownReports = showFixed ? inHouse : openReports
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
            options={[
              { value: ALL_HOUSES, label: 'All houses' },
              ...houses.map((h) => ({ value: h.house_id, label: h.address })),
            ]}
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
          <div className="card-head">
            <h2>{showFixed ? 'All reports' : 'Open reports'}</h2>
            {/* Only when there are fixed reports to add */}
            {inHouse.length > openReports.length && (
              <button className="link-button" onClick={() => setShowFixed(!showFixed)}>
                {showFixed ? 'Show less' : 'View all reports'}
              </button>
            )}
          </div>
          {data && shownReports.length === 0 && (
            <p className="row-sub">{showFixed ? 'No reports yet.' : 'No open reports. Everything is fixed.'}</p>
          )}
          <div className="table-wrap">
            {/* Fixed column widths, so the columns don't jump when "View all reports" adds rows */}
            <table className="table table-fixed">
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
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
                {shownReports.map((r) => (
                  <tr key={r.id}>
                    <td><span className={'urgency urgency-' + r.urgency.toLowerCase()}>{r.urgency}</span></td>
                    <td>
                      <strong>{r.title}</strong>
                      <p className="row-sub">{r.category}</p>
                    </td>
                    <td>{r.house} · {r.room}</td>
                    <td className="muted">{r.posted} · {r.reportedBy}</td>
                    <td>{statusText(r)}</td>
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
