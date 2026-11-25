// Small coloured dot with a label, e.g. "● Running low"
// color: 'orange' | 'red' | 'green' | 'grey'
function StatusDot({ color, children }) {
  return (
    <span className="status">
      <span className={'dot dot-' + color} />
      {children}
    </span>
  )
}

export default StatusDot
