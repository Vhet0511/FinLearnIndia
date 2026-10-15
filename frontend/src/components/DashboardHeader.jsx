import { useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import { clearSession } from '../auth.js';

export default function DashboardHeader({ role, menuOpen, onMenuToggle }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className="dash-header">
      <div className="dash-header__left">
        <button
          type="button"
          className="dash-header__menu"
          aria-label="Toggle sidebar menu"
          aria-expanded={menuOpen}
          aria-controls="dashboard-sidebar"
          onClick={onMenuToggle}
        >
          <span className={`burger ${menuOpen ? 'burger--open' : ''}`} />
        </button>
        <Logo />
      </div>
      <div className="dash-header__right">
        <span className={`role-badge role-badge--${role}`}>
          {role === 'admin' ? 'Admin' : 'User'}
        </span>
        <button type="button" className="btn btn--outline btn--sm" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}