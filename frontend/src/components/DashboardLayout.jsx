import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardHeader from './DashboardHeader.jsx';
import Sidebar from './Sidebar.jsx';

const NAV = {
  user: {
    title: 'User Dashboard',
    items: [
      { to: '/user/profile', label: 'User Profile', icon: '👤' },
      { to: '/user/lessons', label: 'Lessons', icon: '📚' },
      { to: '/user/portfolio', label: 'Portfolio Analysis', icon: '📊' },
    ],
  },
  admin: {
    title: 'Admin Dashboard',
    items: [
      { to: '/admin/profile', label: 'Admin Profile', icon: '🛡️' },
      { to: '/admin/create-lesson', label: 'Create Lesson', icon: '✏️' },
      { to: '/admin/draft-lessons', label: 'Draft Lessons', icon: '📝' },
      { to: '/admin/uploaded-lessons', label: 'Uploaded Lessons', icon: '📤' },
    ],
  },
};

export default function DashboardLayout({ role }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = NAV[role];

  return (
    <div className="dash">
      <DashboardHeader
        role={role}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((v) => !v)}
      />
      <div className="dash__body">
        <Sidebar
          title={nav.title}
          items={nav.items}
          open={menuOpen}
          onNavigate={() => setMenuOpen(false)}
        />
        {menuOpen && (
          <div className="dash__overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />
        )}
        <main className="dash__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}