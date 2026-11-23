import { Routes, Route } from 'react-router'
import AppLayout from './components/AppLayout.jsx'
import TenantPage from './pages/TenantPage.jsx'
import ManagerPage from './pages/ManagerPage.jsx'
import TechnicianPage from './pages/TechnicianPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

function App() {
  return (
    <Routes>
      {/* Login page: no app shell before someone is logged in */}
      <Route path="/" element={<LoginPage />} />

      {/* All pages inside AppLayout get the Roomify header and menu */}
      <Route element={<AppLayout />}>
        <Route path="/tenant" element={<TenantPage />} />
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/technician" element={<TechnicianPage />} />

        {/* Other menu pages: keep the header, page content is added later */}
        <Route path="*" element={null} />
      </Route>
    </Routes>
  )
}

export default App
