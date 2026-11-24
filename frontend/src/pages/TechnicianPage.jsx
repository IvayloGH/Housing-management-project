import { Fragment, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import Icon from '../components/Icon.jsx'
import PhotoView from '../components/PhotoView.jsx'
import { technicianInfo, jobs as startJobs, updateJob } from '../data/mockData.js'
import technicianPhoto from '../assets/photos/technician-jobs.jpg'

const whenOptions = [
  'Not planned yet',
  'Today, morning',
  'Today, afternoon',
  'Tomorrow, morning',
  'Tomorrow, afternoon',
  'Thursday 19 Nov',
  'Friday 20 Nov',
]
const statusOptions = ['New', 'Accepted', 'In progress', 'Fixed']

function TechnicianPage() {
  const [jobs, setJobs] = useState(startJobs)
  // The job whose details are open (null = none)
  const [openJobId, setOpenJobId] = useState(null)
  // The job that was just saved, to show "Saved" next to it
  const [savedJobId, setSavedJobId] = useState(null)

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const newCount = jobs.filter((j) => j.status === 'New').length

  function changeWhen(id, when) {
    setJobs(jobs.map((j) => (j.id === id ? { ...j, when: when } : j)))
    setSavedJobId(null)
  }

  function changeStatus(id, status) {
    setJobs(jobs.map((j) => (j.id === id ? { ...j, status: status } : j)))
    setSavedJobId(null)
  }

  function save(job) {
    // Save it in the shared fake data too, so "Work done" sees the new status
    updateJob(job.id, job.when, job.status)
    setSavedJobId(job.id)
  }

  function toggleDetails(id) {
    if (openJobId === id) {
      setOpenJobId(null)
    } else {
      setOpenJobId(id)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Technician · ${technicianInfo.name} · ${today}`}
        title="Your repair jobs."
        titleMuted="Accept, plan and update them here."
        image={technicianPhoto}
      />

      <div className="page-body">
        <div className="grid-3">
          <StatCard color="grey" label="All requests" number={jobs.length} />
          <StatCard color="orange" label="New requests" number={newCount} />
          <StatCard color="green" label="Accepted by you" number={jobs.length - newCount} />
        </div>

        <section className="card">
          <div className="card-head">
            <h2>To do requests</h2>
            <span className="card-note">{jobs.length} open jobs</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Urgency</th>
                  <th>State</th>
                  <th>When</th>
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
                        <button className="link-button" onClick={() => toggleDetails(job.id)}>
                          {openJobId === job.id ? 'Hide details' : 'See photo and details'}
                        </button>
                      </td>
                      <td><span className={'urgency urgency-' + job.urgency.toLowerCase()}>{job.urgency}</span></td>
                      <td>{job.when === 'Not planned yet' ? 'Not answered yet' : 'Planned · ' + job.when}</td>
                      <td>
                        <select aria-label="When" value={job.when} onChange={(e) => changeWhen(job.id, e.target.value)}>
                          {whenOptions.map((w) => <option key={w}>{w}</option>)}
                        </select>
                      </td>
                      <td>
                        <select aria-label="Status" value={job.status} onChange={(e) => changeStatus(job.id, e.target.value)}>
                          {statusOptions.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="right">
                        {savedJobId === job.id ? (
                          <span className="saved"><Icon name="check" /> Saved</span>
                        ) : (
                          <button className="btn btn-light btn-small" onClick={() => save(job)}>Save</button>
                        )}
                      </td>
                    </tr>

                    {/* The extra row with the photo and description, when "See photo and details" is clicked */}
                    {openJobId === job.id && (
                      <tr className="details-row">
                        <td colSpan="6">
                          <div className="job-details">
                            <PhotoView src={job.photo} alt={'Photo of: ' + job.title} size="small" />
                            <p>{job.description}</p>
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
      </div>
    </>
  )
}

export default TechnicianPage
