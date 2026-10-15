import FeatureCard from './FeatureCard.jsx';

const features = [
  {
    icon: '📈',
    title: 'Learn the Basics',
    description: 'Understand stocks, mutual funds, and SIPs.',
  },
  {
    icon: '🗣️',
    title: 'Learn in Your Language',
    description: 'Make financial concepts easier to understand.',
  },
  {
    icon: '🧠',
    title: 'Practice Financial Thinking',
    description: 'Explore risk, returns, and diversification.',
  },
];

export default function Features() {
  return (
    <section id="learn" className="section">
      <div className="container">
        <div className="section__head">
          <span className="eyebrow">What you&apos;ll get</span>
          <h2>Start your money journey with confidence</h2>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}