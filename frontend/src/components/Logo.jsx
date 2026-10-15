import { Link } from 'react-router-dom';

export default function Logo({ to = '/', onClick }) {
  return (
    <Link to={to} className="logo" onClick={onClick} aria-label="FinLearn India home">
      <span className="logo__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="32" height="32">
          <rect width="32" height="32" rx="8" fill="#16a34a" />
          <path
            d="M7 21l6-6 4 4 8-9"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="logo__text">FinLearn India</span>
    </Link>
  );
}