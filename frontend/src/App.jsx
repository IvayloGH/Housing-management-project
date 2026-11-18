import { Routes, Route, Link } from 'react-router'
import TenantPage from './pages/TenantPage.jsx'
import ManagerPage from './pages/ManagerPage.jsx'
import TechnicianPage from './pages/TechnicianPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

function App() {
  return (
    <div>
      <nav>
        <Link to="/">Login</Link> | <Link to="/tenant">Tenant</Link> |{' '}
        <Link to="/manager">Manager</Link> | <Link to="/technician">Technician</Link>
      </nav>

      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/tenant" element={<TenantPage />} />
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/technician" element={<TechnicianPage />} />
      </Routes>
    </div>
  )
}

export default App