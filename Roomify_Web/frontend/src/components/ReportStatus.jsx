import StatusDot from './StatusDot.jsx'

// The coloured dot and text for the status of a report (tenant pages).
// report: from toReport() in api/convert.js
function ReportStatus({ report }) {
  if (report.status === 'waiting') {
    return <StatusDot color="orange">Waiting for the manager</StatusDot>
  }
  if (report.status === 'inProgress') {
    return <StatusDot color="green">In progress{report.technician ? ' · ' + report.technician : ''}</StatusDot>
  }
  return <StatusDot color="grey">Fixed{report.technician ? ' by ' + report.technician : ''}</StatusDot>
}

export default ReportStatus
