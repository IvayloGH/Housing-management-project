import PageHeader from '../components/PageHeader.jsx'
import { PersonalDetailsCard, AddressCard, SignInCard, LogoutCard } from '../components/ProfileCards.jsx'

function TenantProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Tenant · My profile" title="Your profile." />
      <div className="page-body stack">
        <PersonalDetailsCard />
        <AddressCard />
        <SignInCard />
        <LogoutCard />
      </div>
    </>
  )
}

export default TenantProfilePage
