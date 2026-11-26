import { Fragment, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import Icon from '../components/Icon.jsx'
import PhotoView from '../components/PhotoView.jsx'
import technicianPhoto from '../assets/building.jpg'
import { useApi } from '../api/useApi.js'
import { useUser } from '../api/userContext.js'
import { getMyJobs, setJobStatus } from '../api/roomify.js'
import { firstName, jobStatusCode, toJob } from '../api/convert.js'
import { longDayText } from '../utils/dates.js'

async function loadJobs() {
  const tickets = await getMyJobs()
  return { jobs: tickets.filter((t) => t.status !== 'RESOLVED').map(toJob) }
}

// Loads the jobs first, then shows the table
function TechnicianPage() {
  const { user } = useUser()
  const { data, error } = useApi(loadJobs)
  // Worked out on every visit, so it is right even when the tab stays open overnight
  const today = longDayText(new Date())
  return (
    <>
      <PageHeader
        eyebrow={`Technician · ${firstName(user.name)} · ${today}`}
        title="Your repair jobs."
        titleMuted="Accept, plan and update them here."
        image={technicianPhoto}
      />
      <div className="page-body">
        {error && <p className="error">{error}</p>}
        {data && <JobsTable startJobs={data.jobs} />}
      </div>
    </>
  )
}

function JobsTable({ startJobs }) {
  const [jobs, setJobs] = useState(startJobs)
  // The status each job has on the server, to know if it changed
  const [savedStatus, setSavedStatus] = useState(Object.fromEntries(startJobs.map((j) => [j.id, j.status])))
  // The job whose details are open (null = none)
  const [openJobId, setOpenJobId] = useState(null)
  // The job that was just saved, to show "Saved" next to it
  const [savedJobId, setSavedJobId] = useState(null)
  const [savingJobId, setSavingJobId] = useState(null)
  const [error, setError] = useState('')

  const newCount = jobs.filter((j) => j.status === 'New').length

  function changeStatus(id, status) {
    setJobs(jobs.map((j) => (j.id === id ? { ...j, status: status } : j)))
    setSavedJobId(null)
  }

  async function save(job) {
    setError('')
    setSavingJobId(job.id)
    try {
      if (job.status !== savedStatus[job.id] && job.status !== 'New') {
        await setJobStatus(job.id, jobStatusCode[job.status])
        setSavedStatus({ ...savedStatus, [job.id]: job.status })
      }
      setSavedJobId(job.id)
    } catch (err) {
      setError(err.message)
    }
    setSavingJobId(null)
  }

  function toggleDetails(id) {
    setOpenJobId(openJobId === id ? null : id)
  }

  // A job can go forward (New -> In progress -> Fixed), not back
  function statusOptions(job) {
    if (savedStatus[job.id] === 'New') return ['New', 'In progress', 'Fixed']
    if (savedStatus[job.id] === 'In progress') return ['In progress', 'Fixed']
    return ['Fixed']
  }

  return (
    <>
      <div className="grid-3">
        <StatCard color="grey" label="All requests" number={jobs.length} />
        <StatCard color="orange" label="New requests" number={newCount} />
        <StatCard color="green" label="Started" number={jobs.length - newCount} />
      </div>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <div className="card-head">
          <h2>To do requests</h2>
          <span className="card-note">{jobs.length} open jobs</span>
        </div>
        {jobs.length === 0 && <p className="row-sub">No jobs right now.</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Urgency</th>
                <th>Newest note</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                // Fragment: groups the two table rows of one job without an extra element
                <Fragment key={job.id}>
                  <tr>
                    <td>
                      <strong>
                        {job.status === 'New' && <span className="dot dot-green new-dot" />}
                        {job.title}
                      </strong>
                      <p className="row-sub">{job.place} · Reported {job.reported}</p>
                      {/* Only shown when the tenant added a photo */}
                      {job.photo && (
                        <button className="link-button" onClick={() => toggleDetails(job.id)}>
                          {openJobId === job.id ? 'Hide photo' : 'See photo'}
                        </button>
                      )}
                    </td>
                    <td><span className={'urgency urgency-' + job.urgency.toLowerCase()}>{job.urgency}</span></td>
                    <td className="muted">{job.note || '-'}</td>
                    <td>
                      <select aria-label="Status" value={job.status} onChange={(e) => changeStatus(job.id, e.target.value)}>
                        {statusOptions(job).map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="right">
                      {savedJobId === job.id ? (
                        <span className="saved"><Icon name="check" /> Saved</span>
                      ) : (
                        <button
                          className="btn btn-light btn-small"
                          disabled={savingJobId !== null}
                          onClick={() => save(job)}
                        >
                          {savingJobId === job.id ? 'Saving…' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* The extra row with the photo, when "See photo" is clicked */}
                  {openJobId === job.id && job.photo && (
                    <tr className="details-row">
                      <td colSpan="5">
                        <div className="job-details">
                          <PhotoView src={job.photo} alt={'Photo of: ' + job.title} size="small" />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default TechnicianPage
