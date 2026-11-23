import { Link } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'

function TenantPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tenant · Kerkstraat 12, Eindhoven · Room 06"
        title="Your house today."
        subtitle="Check your chores, keep the shared groceries up to date and follow your repairs."
      >
        <Link to="/tenant/schedule" className="btn">View cleaning schedule</Link>
        <Link to="/tenant/report" className="btn btn-light">Report a problem</Link>
      </PageHeader>
    </>
  )
}

export default TenantPage
