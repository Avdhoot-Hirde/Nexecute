import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IDE_LANGUAGES, useIdeStore } from '../Store/IdeStore';
import { useAuthStore } from '../Store/AuthStore';

export default function History() {
  const navigate = useNavigate();
  const { history, historyLoading, historyError, loadHistory, loadHistoryItem, status } = useIdeStore();
  const authenticated = useAuthStore(state => state.isAuthenticated);
  const userId = useAuthStore(state => state.user?.id);
  useEffect(() => { if (authenticated) loadHistory(); }, [authenticated, userId, loadHistory]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-16 pt-28 text-slate-100">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Code history</h1>
          <p className="mt-2 text-sm text-slate-400">Your saved runs. Select a file to open it in the editor.</p></div>
        <Link to="/ide" className="rounded-lg bg-violet-500/20 px-4 py-2 text-sm text-violet-200">Open IDE</Link>
      </div>
      {!authenticated ? <p className="rounded-xl border border-white/10 p-6 text-slate-300"><Link to="/login" className="text-violet-300 underline">Sign in</Link> to view your saved code.</p> : <>
        {historyError && <div role="alert" className="mb-4 rounded-xl border border-rose-400/20 p-4 text-rose-300">{historyError} <button onClick={loadHistory} className="ml-2 underline">Retry</button></div>}
        {historyLoading && <p role="status" className="py-8 text-slate-400">Loading history...</p>}
        {!historyLoading && !historyError && history.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-10 text-center text-slate-400">No saved runs yet. Run code in the IDE to start your history.</p>}
        {status === 'running' && <p className="mb-4 text-amber-300">Wait for the current run to finish before opening another file.</p>}
        <div className="grid gap-3">
          {history.map(item => <button key={item.id} type="button" disabled={status === 'running'}
            onClick={() => { if (loadHistoryItem(item)) navigate('/ide'); }}
            className="rounded-xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-violet-400/40 hover:bg-violet-500/5 disabled:cursor-not-allowed disabled:opacity-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono font-medium text-violet-200">{item.fileName || 'Saved code'}</span>
              <span className={item.status === 'error' ? 'text-xs text-rose-300' : 'text-xs text-emerald-300'}>{item.status === 'error' ? 'Failed' : 'Completed'}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>{IDE_LANGUAGES.find(language => language.value === item.language)?.label || item.language}</span>
              <time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Earlier run'}</time>
            </div>
            <pre className="mt-4 max-h-20 overflow-hidden whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-500">{item.code.slice(0, 400)}</pre>
          </button>)}
        </div>
      </>}
    </main>
  );
}
