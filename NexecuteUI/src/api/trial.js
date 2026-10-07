const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// The homepage trial must work independently of login or expired sessions.
export function executeTrial({ code, language, stdin, file }) {
  return fetch(`${API_BASE_URL}/api/trial/execute`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, stdin, file }),
  });
}
