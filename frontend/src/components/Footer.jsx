import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Link to="/" className="logo">
            <span className="logo__text">FinLearn India</span>
          </Link>
          <p>Simple financial education for every beginner.</p>
        </div>
        <ul className="footer__links">
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><a href="#privacy">Privacy Policy</a></li>
          <li><a href="#terms">Terms</a></li>
        </ul>
      </div>
      <div className="container footer__bottom">
        <small>&copy; {year} FinLearn India. All rights reserved.</small>
      </div>
    </footer>
  );
}