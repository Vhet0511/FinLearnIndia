export default function TrustSection() {
  return (
    <section id="about" className="section section--tint">
      <div className="container trust">
        <div className="trust__shield" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h2>Built for learning, not for selling</h2>
        <p className="trust__text">
          FinLearn India provides financial education for beginners. Our lessons explain how money
          and markets work in plain language, so you can build understanding at your own pace.
        </p>
        <p className="disclaimer">Educational content only. Not investment advice.</p>
      </div>
    </section>
  );
}