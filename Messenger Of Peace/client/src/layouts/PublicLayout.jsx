import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { usePageSeo } from '../utils/seo'

export default function PublicLayout() {
  // Page title and description for search engines (Dashboard > SEO can change them).
  usePageSeo(useLocation().pathname)
  return (
    <div className="purple-theme">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
