import PageHeader from '../components/PageHeader.jsx'
import { PersonalDetailsCard, SignInCard, LogoutCard } from '../components/ProfileCards.jsx'

function ManagerProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Property manager · My profile" title="Your profile." />
      <div className="page-body stack">
        <PersonalDetailsCard extraField="Company" />
        <SignInCard />
        <LogoutCard />
      </div>
    </>
  )
}

export default ManagerProfilePage
