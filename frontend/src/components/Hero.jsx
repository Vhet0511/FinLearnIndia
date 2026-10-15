import { Link } from 'react-router-dom';

function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hv-card hv-card--main">
        <div className="hv-card__head">
          <span className="hv-dot" />
          <span className="hv-title">Your SIP growth</span>
          <span className="hv-badge">+12.4%</span>
        </div>
        <div className="hv-chart">
          <span style={{ height: '28%' }} />
          <span style={{ height: '40%' }} />
          <span style={{ height: '36%' }} />
          <span style={{ height: '55%' }} />
          <span style={{ height: '62%' }} />
          <span style={{ height: '78%' }} />
          <span style={{ height: '92%' }} />
        </div>
        <div className="hv-foot">
          <span>₹5,000 / month</span>
          <span>10 years</span>
        </div>
      </div>

      <div className="hv-card hv-card--float hv-card--lesson">
        <span className="hv-icon">📘</span>
        <div>
          <strong>Lesson 1</strong>
          <small>What is a mutual fund?</small>
        </div>
      </div>

      <div className="hv-card hv-card--float hv-card--coin">
        <span className="hv-icon hv-icon--green">₹</span>
        <div>
          <strong>Diversify</strong>
          <small>Spread your risk</small>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="container hero__inner">
        <div className="hero__content">
          <span className="eyebrow">Financial education for beginners</span>
          <h1>Understand Money. Learn Investing. Build Confidence.</h1>
          <p className="hero__text">
            Learn about the Indian stock market, mutual funds, SIPs, and personal finance through
            simple, beginner-friendly lessons.
          </p>
          <div className="hero__cta">
            <Link to="/signup" className="btn btn--primary btn--lg">
              Get Started — It&apos;s Free
            </Link>
            <Link to="/login" className="btn btn--outline btn--lg">
              Log In
            </Link>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}