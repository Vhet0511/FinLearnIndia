// DEMO ONLY: hardcoded credentials and client-side role checks are NOT secure
// authentication. Anyone can read these values in the browser. This exists only
// so the prototype UI can be demonstrated. Replace it with real server-side
// authentication before handling any real users.

const SESSION_KEY = 'finlearn_demo_role';

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin', role: 'admin' },
  { username: 'user', password: 'user', role: 'user' },
];

// Fallback in case sessionStorage is unavailable (e.g. blocked by the browser).
let memoryRole = null;

export function authenticate(username, password) {
  const match = DEMO_ACCOUNTS.find(
    (account) => account.username === username && account.password === password
  );
  return match ? match.role : null;
}

function validRole(role) {
  return role === 'admin' || role === 'user' ? role : null;
}

export function getRole() {
  try {
    // sessionStorage is the source of truth whenever it is available.
    return validRole(sessionStorage.getItem(SESSION_KEY));
  } catch {
    // sessionStorage is blocked or unavailable; use the in-memory value.
    return validRole(memoryRole);
  }
}

export function setRole(role) {
  memoryRole = role;
  try {
    sessionStorage.setItem(SESSION_KEY, role);
  } catch {
    // Ignore; memoryRole still holds the value.
  }
}

export function clearSession() {
  memoryRole = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore.
  }
}

export function homePathForRole(role) {
  return role === 'admin' ? '/admin/profile' : '/user/profile';
}