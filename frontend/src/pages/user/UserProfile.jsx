import PlaceholderPage from '../../components/PlaceholderPage.jsx';

export default function UserProfile() {
  return (
    <PlaceholderPage title="User Profile" subtitle="Your account details.">
      <dl className="info-list">
        <div>
          <dt>Username</dt>
          <dd>sample_user</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>User</dd>
        </div>
      </dl>
      <p className="note">Profile management will be implemented later.</p>
    </PlaceholderPage>
  );
}