import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../Store/AuthStore';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const completeOAuthLogin = useAuthStore((state) => state.completeOAuthLogin);
  const error = useAuthStore((state) => state.error);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    completeOAuthLogin()
      .then((returnTo) => {
        sessionStorage.removeItem('auth-return-to');
        window.history.replaceState({}, document.title, '/auth/callback');
        navigate(returnTo, { replace: true });
      })
      .catch(() => {});
  }, [completeOAuthLogin, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <p className="text-lg">{error ? 'GitHub sign-in failed' : 'Completing GitHub sign-in...'}</p>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {error && (
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-5 rounded bg-violet-600 px-4 py-2"
          >
            Back to login
          </button>
        )}
      </div>
    </main>
  );
}
