import PlaceholderPage from '../../components/PlaceholderPage.jsx';

export default function AdminProfile() {
  return (
    <PlaceholderPage title="Admin Profile" subtitle="Your administrator account details.">
      <dl className="info-list">
        <div>
          <dt>Username</dt>
          <dd>sample_admin</dd>
        </div>
        <div>
          <dt>Current role</dt>
          <dd>Admin</dd>
        </div>
      </dl>
      <p className="note">Profile management will be implemented later.</p>
    </PlaceholderPage>
  );
}