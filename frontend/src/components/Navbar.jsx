import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Logo onClick={close} />

        <button
          type="button"
          className="navbar__toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls="nav-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`burger ${open ? 'burger--open' : ''}`} />
        </button>

        <nav id="nav-menu" className={`navbar__menu ${open ? 'navbar__menu--open' : ''}`}>
          <ul className="navbar__links">
            <li><a href="#home" onClick={close}>Home</a></li>
            <li><a href="#learn" onClick={close}>Learn</a></li>
            <li><a href="#about" onClick={close}>About</a></li>
          </ul>
          <div className="navbar__actions">
            <Link to="/login" className="btn btn--ghost" onClick={close}>Log In</Link>
            <Link to="/signup" className="btn btn--primary" onClick={close}>Get Started</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}