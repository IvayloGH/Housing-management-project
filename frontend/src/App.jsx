import { Routes, Route } from 'react-router'
import AppLayout from './components/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import FaceLoginPage from './pages/FaceLoginPage.jsx'

import TenantPage from './pages/TenantPage.jsx'
import TenantSchedulePage from './pages/TenantSchedulePage.jsx'
import TenantGroceriesPage from './pages/TenantGroceriesPage.jsx'
import TenantReportPage from './pages/TenantReportPage.jsx'
import TenantProfilePage from './pages/TenantProfilePage.jsx'

import ManagerPage from './pages/ManagerPage.jsx'
import ManagerReviewPage from './pages/ManagerReviewPage.jsx'
import ManagerHousesPage from './pages/ManagerHousesPage.jsx'
import ManagerProfilePage from './pages/ManagerProfilePage.jsx'

import TechnicianPage from './pages/TechnicianPage.jsx'
import TechnicianWorkPage from './pages/TechnicianWorkPage.jsx'
import TechnicianProfilePage from './pages/TechnicianProfilePage.jsx'

function App() {
  return (
    <Routes>
      {/* Pages before someone is logged in: no app shell */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/face-login" element={<FaceLoginPage />} />

      {/* All pages inside AppLayout get the Roomify header and menu */}
      <Route element={<AppLayout />}>
        <Route path="/tenant" element={<TenantPage />} />
        <Route path="/tenant/schedule" element={<TenantSchedulePage />} />
        <Route path="/tenant/groceries" element={<TenantGroceriesPage />} />
        <Route path="/tenant/report" element={<TenantReportPage />} />
        <Route path="/tenant/profile" element={<TenantProfilePage />} />

        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/manager/review" element={<ManagerReviewPage />} />
        <Route path="/manager/houses" element={<ManagerHousesPage />} />
        <Route path="/manager/profile" element={<ManagerProfilePage />} />

        <Route path="/technician" element={<TechnicianPage />} />
        <Route path="/technician/done" element={<TechnicianWorkPage />} />
        <Route path="/technician/profile" element={<TechnicianProfilePage />} />

        {/* Unknown address inside the app: keep the header */}
        <Route path="*" element={null} />
      </Route>
    </Routes>
  )
}

export default App
