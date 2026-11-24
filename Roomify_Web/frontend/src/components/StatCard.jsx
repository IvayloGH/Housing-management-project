import StatusDot from './StatusDot.jsx'

// Card with a label and a big number, e.g. "Urgent 2"
function StatCard({ color, label, number }) {
  return (
    <div className="stat-card">
      <StatusDot color={color}>{label}</StatusDot>
      <p className="stat-number">{number}</p>
    </div>
  )
}

export default StatCard
