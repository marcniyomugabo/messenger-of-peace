import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'

import Home from './pages/public/Home'
import About from './pages/public/About'
import Leadership from './pages/public/Leadership'
import Information from './pages/public/Information'
import Activities from './pages/public/Activities'
import Portfolio from './pages/public/Portfolio'
import Gallery from './pages/public/Gallery'
import JoinUs from './pages/public/JoinUs'
import Members from './pages/public/Members'
import Contact from './pages/public/Contact'
import Login from './pages/auth/Login'

import Dashboard from './pages/dashboard/Dashboard'
import MembersList from './pages/members/MembersList'
import MemberDetail from './pages/members/MemberDetail'
import AddMember from './pages/members/AddMember'
import ContactMessagesPage from './pages/messages/ContactMessagesPage'
import ActivitiesManagement from './pages/activities/ActivitiesManagement'
import GalleryManagement from './pages/gallery/GalleryManagement'
import LibraryManagement from './pages/library/LibraryManagement'
import InformationManagement from './pages/information/InformationManagement'
import LeadershipManagement from './pages/leadership/LeadershipManagement'
import ApplicationsManagement from './pages/applications/ApplicationsManagement'
import AttendanceManagement from './pages/attendance/AttendanceManagement'
import SettingsPage from './pages/settings/SettingsPage'

function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuth()
  if (!token) return <Navigate to="/login" />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" />
  return children
}

export default function App() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="leadership" element={<Leadership />} />
        <Route path="information" element={<Information />} />
        <Route path="activities" element={<Activities />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="members" element={<Members />} />
        <Route path="join-us" element={<JoinUs />} />
        <Route path="contact" element={<Contact />} />
      </Route>

      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="messages" element={<ContactMessagesPage />} />
        <Route path="activities" element={<ActivitiesManagement />} />
        <Route path="members" element={<MembersList />} />
        <Route path="members/new" element={<AddMember />} />
        <Route path="members/:id" element={<MemberDetail />} />
        <Route path="library" element={<LibraryManagement />} />
        <Route path="information" element={<InformationManagement />} />
        <Route path="board-members" element={<LeadershipManagement />} />
        <Route path="gallery" element={<GalleryManagement />} />
        <Route path="join-requests" element={<ApplicationsManagement />} />
        <Route path="attendance" element={<AttendanceManagement />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
