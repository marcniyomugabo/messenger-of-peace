import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { STAFF, PEOPLE, ATTENDANCE, LEADERS, CONTENT, FINANCE, ADMIN, SAFEGUARDING } from './config/roles'

import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'

import Home from './pages/public/Home'
import About from './pages/public/About'
import Units from './pages/public/Units'
import Leadership from './pages/public/Leadership'
import Information from './pages/public/Information'
import Activities from './pages/public/Activities'
import Portfolio from './pages/public/Portfolio'
import Gallery from './pages/public/Gallery'
import JoinUs from './pages/public/JoinUs'
import Members from './pages/public/Members'
import Contact from './pages/public/Contact'
import ReportConcern from './pages/public/ReportConcern'
import News from './pages/public/News'
import Events from './pages/public/Events'
import Support from './pages/public/Support'
import NewsStory from './pages/public/NewsStory'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

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
import MyAttendance from './pages/attendance/MyAttendance'
import NoticeBoard from './pages/notices/NoticeBoard'
import MyProfile from './pages/profile/MyProfile'
import NotFound from './pages/NotFound'
import SettingsPage from './pages/settings/SettingsPage'
import EventsManagement from './pages/events/EventsManagement'
import AnnouncementsManagement from './pages/users/AnnouncementsManagement'
import UnitsManagement from './pages/units/UnitsManagement'
import HomeContentManagement from './pages/home/HomeContentManagement'
import NewsManagement from './pages/news/NewsManagement'
import AboutContentManagement from './pages/about/AboutContentManagement'
import NavigationManagement from './pages/navigation/NavigationManagement'
import SEOManagement from './pages/seo/SEOManagement'
import MediaManagement from './pages/media/MediaManagement'
import NotificationsPage from './pages/notifications/NotificationsPage'
import ContributionsDashboard from './pages/finance/ContributionsDashboard'
import ContributionOverview from './pages/finance/ContributionOverview'
import ContributionReports from './pages/finance/ContributionReports'
import MemberContributions from './pages/finance/MemberContributions'
import PaymentHistory from './pages/finance/PaymentHistory'
import FinancialLedger from './pages/finance/FinancialLedger'
import ReportsPage from './pages/reports/ReportsPage'
import AuditLogsPage from './pages/audit/AuditLogsPage'
import ConcernsPage from './pages/concerns/ConcernsPage'
import UserManagement from './pages/users/UserManagement'
import RoleManagement from './pages/users/RoleManagement'

function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuth()
  if (!token) return <Navigate to="/login" />
  // A saved user from before the role was stored: wait for /auth/me to fill it in.
  if (roles && !user?.role) return null
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" />
  return children
}

const guard = (roles, page) => <ProtectedRoute roles={roles}>{page}</ProtectedRoute>

// Staff start on the dashboard; members (who cannot use it) start on their notifications.
function DashboardHome() {
  const { user } = useAuth()
  if (!user?.role) return null
  return STAFF.includes(user.role) ? <Dashboard /> : <Navigate to="/dashboard/notifications" replace />
}

export default function App() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="units" element={<Units />} />
        <Route path="leadership" element={<Leadership />} />
        <Route path="information" element={<Information />} />
        <Route path="activities" element={<Activities />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="members" element={<Members />} />
        <Route path="join-us" element={<JoinUs />} />
        <Route path="contact" element={<Contact />} />
        <Route path="report-concern" element={<ReportConcern />} />
        <Route path="news" element={<News />} />
        <Route path="events" element={<Events />} />
        <Route path="support" element={<Support />} />
        <Route path="news/:slug" element={<NewsStory />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="my-attendance" element={<MyAttendance />} />
        <Route path="notice-board" element={<NoticeBoard />} />

        <Route path="members" element={guard(PEOPLE, <MembersList />)} />
        <Route path="members/new" element={guard(PEOPLE, <AddMember />)} />
        <Route path="members/:id" element={guard(PEOPLE, <MemberDetail />)} />
        <Route path="members/:id/edit" element={guard(PEOPLE, <AddMember />)} />
        <Route path="join-requests" element={guard(PEOPLE, <ApplicationsManagement />)} />
        <Route path="messages" element={guard(PEOPLE, <ContactMessagesPage />)} />
        <Route path="attendance" element={guard(ATTENDANCE, <AttendanceManagement />)} />
        <Route path="events" element={guard(PEOPLE, <EventsManagement />)} />
        <Route path="announcements" element={guard(PEOPLE, <AnnouncementsManagement />)} />
        <Route path="board-members" element={guard(LEADERS, <LeadershipManagement />)} />
        <Route path="units" element={guard(LEADERS, <UnitsManagement />)} />

        <Route path="library" element={guard(CONTENT, <LibraryManagement />)} />
        <Route path="information" element={guard(CONTENT, <InformationManagement />)} />
        <Route path="gallery" element={guard(CONTENT, <GalleryManagement />)} />
        <Route path="media" element={guard(CONTENT, <MediaManagement />)} />
        <Route path="activities" element={guard(LEADERS, <ActivitiesManagement />)} />
        {/* The old Portfolio page was replaced by Library (the public Library page reads it). */}
        <Route path="portfolio" element={<Navigate to="/dashboard/library" replace />} />
        <Route path="home-content" element={guard(LEADERS, <HomeContentManagement />)} />
        <Route path="news" element={guard(CONTENT, <NewsManagement />)} />
        <Route path="about-content" element={guard(LEADERS, <AboutContentManagement />)} />
        <Route path="navigation" element={guard(LEADERS, <NavigationManagement />)} />
        <Route path="seo" element={guard(LEADERS, <SEOManagement />)} />

        <Route path="contributions" element={guard(FINANCE, <ContributionsDashboard />)} />
        <Route path="contributions/member/:id" element={guard(FINANCE, <MemberContributions />)} />
        <Route path="contribution-overview" element={guard(FINANCE, <ContributionOverview />)} />
        <Route path="contribution-reports" element={guard(FINANCE, <ContributionReports />)} />
        <Route path="payments" element={guard(FINANCE, <PaymentHistory />)} />
        <Route path="finance" element={guard(FINANCE, <FinancialLedger />)} />

        <Route path="reports" element={guard(LEADERS, <ReportsPage />)} />
        <Route path="audit-logs" element={guard(LEADERS, <AuditLogsPage />)} />
        <Route path="concerns" element={guard(SAFEGUARDING, <ConcernsPage />)} />
        <Route path="users" element={guard(ADMIN, <UserManagement />)} />
        <Route path="roles" element={guard(ADMIN, <RoleManagement />)} />
        <Route path="settings" element={guard(ADMIN, <SettingsPage />)} />
        <Route path="my-profile" element={<MyProfile />} />
        <Route path="*" element={<NotFound dashboard />} />
      </Route>
    </Routes>
  )
}
