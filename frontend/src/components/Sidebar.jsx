import { NavLink } from 'react-router-dom';

export default function Sidebar({ title, items, open, onNavigate }) {
  return (
    <aside id="dashboard-sidebar" className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <p className="sidebar__title">{title}</p>
      <nav aria-label={title}>
        <ul className="sidebar__list">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
              >
                <span className="sidebar__icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}