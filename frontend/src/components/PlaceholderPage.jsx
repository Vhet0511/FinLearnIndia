export default function PlaceholderPage({ title, subtitle, children }) {
  return (
    <section className="page">
      <h1 className="page__title">{title}</h1>
      {subtitle && <p className="page__subtitle">{subtitle}</p>}
      <div className="card">{children}</div>
    </section>
  );
}