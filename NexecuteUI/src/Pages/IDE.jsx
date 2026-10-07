import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import GitHubLogo from "../assets/GitHubLogo";
import { CustomSelect } from "../components/CustomSelect";
import Navbar from "../components/Navbar";
import PlayIcon from "../components/PlayIcon";
import { useAuthStore } from "../Store/AuthStore";
import { IDE_LANGUAGES, useIdeStore } from "../Store/IdeStore";

const STATUS = {
  idle: { label: "Ready", color: "bg-slate-500" },
  running: { label: "Running", color: "bg-amber-400 animate-pulse" },
  done: { label: "Completed", color: "bg-emerald-400" },
  error: { label: "Failed", color: "bg-rose-400" },
};

function PanelTitle({ children, action }) {
  return (
    <div className="ide-panel-title">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
        {children}
      </h2>
      {action}
    </div>
  );
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function extractCode(message) {
  const match = message.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  return match?.[1]?.trim() || null;
}

function IDE() {
  const centerPanelRef = useRef(null);
  const resizeStartRef = useRef(null);
  const consoleScrollRef = useRef(null);
  const consoleInputRef = useRef(null);
  const [editorShare, setEditorShare] = useState(65);
  const [isResizing, setIsResizing] = useState(false);
  const ide = useIdeStore();
  const initialize = useIdeStore((state) => state.initialize);
  const disconnectSocket = useIdeStore((state) => state.disconnectSocket);
  const user = useAuthStore((state) => state.user);
  const loginWithGithub = useAuthStore((state) => state.loginWithGithub);
  const isGithubConnected = Boolean(user?.gitHubId || user?.gitHubUsername);
  const statusMeta = STATUS[ide.status] || STATUS.idle;
  const canTypeInput = ide.status === "running" &&
    ide.executionMode === "socket" && ide.socketState === "connected";

  useEffect(() => {
    initialize();
    return disconnectSocket;
  }, [initialize, disconnectSocket]);

  useEffect(() => {
    const consoleElement = consoleScrollRef.current;
    if (consoleElement) consoleElement.scrollTop = consoleElement.scrollHeight;
  }, [ide.consoleLines, ide.awaitingInput, canTypeInput]);

  useEffect(() => {
    if (canTypeInput) consoleInputRef.current?.focus({ preventScroll: true });
  }, [canTypeInput, ide.awaitingInput]);

  const resizePanels = (share) => {
    setEditorShare(Math.min(75, Math.max(25, share)));
  };

  const startResize = (event) => {
    if (event.button !== 0 || resizeStartRef.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const panel = centerPanelRef.current;
    resizeStartRef.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      editorHeight: panel.firstElementChild.getBoundingClientRect().height,
      availableHeight: panel.clientHeight - event.currentTarget.offsetHeight,
    };
    setIsResizing(true);
  };

  const moveResize = (event) => {
    const start = resizeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    resizePanels(
      ((start.editorHeight + event.clientY - start.y) / start.availableHeight) * 100,
    );
  };

  const stopResize = (event) => {
    if (resizeStartRef.current?.pointerId !== event.pointerId) return;
    resizeStartRef.current = null;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resizeWithKeyboard = (event) => {
    const step = event.shiftKey ? 10 : 2;
    const nextShare = {
      ArrowUp: editorShare - step,
      ArrowDown: editorShare + step,
      Home: 25,
      End: 75,
    }[event.key];
    if (nextShare === undefined) return;
    event.preventDefault();
    resizePanels(nextShare);
  };

  const submitConsoleInput = (event) => {
    event.preventDefault();
    ide.submitConsoleInput();
  };

  const submitGithubPush = (event) => {
    event.preventDefault();
    ide.pushToGithub();
  };

  return (
    <div className="ide-shell flex h-screen min-h-[42rem] flex-col overflow-hidden text-slate-100">
      <Navbar />

      <header className="ide-toolbar flex min-h-[4.5rem] flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-44 sm:w-52">
            <CustomSelect
              value={ide.language}
              options={IDE_LANGUAGES}
              onChange={ide.changeLanguage}
              ariaLabel="Programming language"
            />
          </div>
          <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
            <span className="truncate font-mono text-xs text-slate-400">
              <input type="text"
                value={ide.file}
                onChange={(fileName)=>ide.setFile(fileName.target.value)}
              />
            </span>
            <span className="text-xs text-slate-700">•</span>
            <span className="text-xs text-slate-500">Saved locally</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-black/20 px-3 py-1.5 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${statusMeta.color}`} />
            {statusMeta.label}
          </div>
          <button
            type="button"
            onClick={ide.runCode}
            disabled={ide.status === "running"}
            className="primary-button flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          >
            <PlayIcon />
            {ide.status === "running" ? "Running..." : "Run code"}
          </button>
        </div>
      </header>

      <main className="ide-workspace min-h-0 flex-1 overflow-auto xl:overflow-hidden">
        <aside className="ide-panel ide-history-panel flex min-h-0 flex-col">
          <PanelTitle
            action={
              <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
                {ide.history.length}
              </span>
            }
          >
            Run history
          </PanelTitle>
          <div className="ide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
            {ide.historyError && (
              <div role="alert" className="px-3 py-3 text-sm text-rose-300">
                {ide.historyError}
                <button type="button" onClick={ide.loadHistory} className="ml-2 underline">Retry</button>
              </div>
            )}
            {ide.historyLoading && (
              <p className="px-3 py-4 text-sm text-slate-500">
                Loading history...
              </p>
            )}
            {!ide.historyLoading && ide.history.length === 0 && (
              <div className="m-1 rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-10 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-violet-400/15 bg-violet-500/10 font-mono text-sm text-violet-300">
                  &gt;_
                </div>
                <p className="mt-4 text-sm font-medium text-slate-300">
                  No runs yet
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Run the current file to start your history.
                </p>
                
              </div>
            )}
            {ide.history.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => ide.loadHistoryItem(item)}
                disabled={ide.status === "running"}
                className="ide-history-item mb-2 w-full rounded-xl px-3 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <span className="truncate text-sm font-medium text-slate-200">
                    {item.fileName || IDE_LANGUAGES.find(
                      (entry) => entry.value === item.language,
                    )?.label || item.language}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.status === "error"
                        ? "bg-rose-400"
                        : "bg-emerald-400"
                    }`}
                  />
                </div>
                <p className="mt-1.5 truncate font-mono text-xs text-slate-500">
                  {item.code?.split("\n")[0] || "Untitled run"}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  {formatTime(item.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section
          ref={centerPanelRef}
          className={`ide-panel ide-center-panel grid min-w-0${isResizing ? " ide-center-panel-resizing" : ""}`}
          style={{
            gridTemplateRows: `minmax(8rem, ${editorShare}fr) 12px minmax(8rem, ${100 - editorShare}fr)`,
          }}
        >
          <div id="ide-editor" className="ide-editor-surface min-h-0 overflow-hidden">
            <PanelTitle
              action={
                <span className="hidden font-mono text-xs text-slate-500 sm:inline">
                  UTF-8 · Spaces: 2
                </span>
              }
            >
              Editor
            </PanelTitle>
            <Editor
              key={ide.language}
              height="calc(100% - 3rem)"
              language={ide.language}
              value={ide.code}
              onChange={(value) => ide.setCode(value ?? "")}
              theme="hc-black"
              loading={
                <div className="p-5 text-sm text-slate-500">
                  Loading editor...
                </div>
              }
              options={{
                automaticLayout: true,
                minimap: { enabled: false },
                fontFamily:
                  "JetBrains Mono, Fira Code, ui-monospace, monospace",
                fontSize: 15,
                lineHeight: 24,
                padding: { top: 18, bottom: 18 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                renderLineHighlight: "gutter",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>

          <div
            className="ide-panel-resizer"
            role="separator"
            tabIndex={0}
            aria-label="Resize editor and console"
            aria-orientation="horizontal"
            aria-controls="ide-editor ide-console"
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={Math.round(editorShare)}
            aria-valuetext={`Editor ${Math.round(editorShare)} percent`}
            title="Drag to resize, use Up/Down arrow keys, or double-click to reset"
            onPointerDown={startResize}
            onPointerMove={moveResize}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            onLostPointerCapture={stopResize}
            onKeyDown={resizeWithKeyboard}
            onDoubleClick={() => resizePanels(65)}
          />

          <div id="ide-console" className="ide-console flex min-h-0 flex-col overflow-y-auto">
            <PanelTitle
              action={
                <div className="flex items-center gap-3">
                  <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        ide.socketState === "connected"
                          ? "bg-emerald-400"
                          : "bg-slate-600"
                      }`}
                    />
                    {ide.socketState === "connected"
                      ? "Live connection"
                      : ide.socketState === "http"
                        ? "HTTP mode"
                        : ide.socketState === "connecting"
                          ? "Connecting"
                          : "Offline"}
                  </span>
                  <button
                    type="button"
                    onClick={() => ide.setConsoleLines([])}
                    className="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-300"
                  >
                    Clear
                  </button>
                </div>
              }
            >
              Console
            </PanelTitle>
            <div
              ref={consoleScrollRef}
              className="ide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 font-mono text-sm leading-6"
            >
              <form onSubmit={submitConsoleInput} className="whitespace-pre-wrap break-words">
                <span role="log" aria-label="Program output" aria-live="polite" aria-relevant="additions text">
                  {ide.consoleLines.map((chunk, index) => (
                    <span
                      key={index}
                      className={chunk.type === "error" ? "text-rose-400"
                        : chunk.type === "command" || chunk.type === "prompt" ? "text-violet-300"
                          : chunk.type === "muted" ? "text-slate-500" : "text-slate-300"}
                    >{chunk.text}</span>
                  ))}
                </span>
                {canTypeInput && (
                  <input
                    ref={consoleInputRef}
                    value={ide.consoleEntry}
                    onChange={(event) => ide.setConsoleEntry(event.target.value)}
                    aria-label="Program input - press Enter to submit"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    style={{ width: Math.max(1, ide.consoleEntry.length + 1) + "ch" }}
                    className="max-w-full border-0 bg-transparent p-0 font-mono text-sm text-slate-100 caret-violet-300 outline-none"
                  />
                )}
              </form>
            </div>
            <div className="shrink-0 border-t border-white/[0.07] px-4 py-2 text-xs text-slate-400" role="status">
              {canTypeInput
                ? ide.awaitingInput ? "Waiting for input - type above and press Enter" : "Running - you can type input above and press Enter"
                : ide.status === "running" ? "Running - waiting for output"
                  : ide.status === "done" ? "Process completed"
                    : ide.status === "error" ? "Execution failed" : "Ready to run"}
            </div>
            {ide.socketState !== "connected" && (
              <details className="shrink-0 border-t border-white/[0.07] px-4 py-2 text-xs text-slate-400">
                <summary className="cursor-pointer">Input for next run (live input unavailable)</summary>
                <label className="mt-2 block">
                One response per line
                <textarea
                  value={ide.stdin}
                  onChange={(event) => ide.setStdin(event.target.value)}
                  disabled={ide.status === "running"}
                  rows={2}
                  className="mt-1 block w-full resize-none rounded bg-black/25 px-2 py-1 font-mono text-slate-200 outline-none focus:ring-1 focus:ring-violet-400/40"
                />
                <span className="mt-1 block">Live interaction is unavailable. Enter input before running.</span>
                </label>
              </details>
            )}
          </div>
        </section>

        <aside className="ide-panel ide-assistant-panel ide-assistant-glow grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden">
          <div className="flex min-h-0 flex-col border-b border-white/[0.07]">
            <PanelTitle
              action={
                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                  AI
                </span>
              }
            >
              Assistant
            </PanelTitle>
            <div className="ide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
              {ide.assistantMessages.map((message) => {
                const suggestedCode = extractCode(message.text);
                return (
                  <div
                    key={message.id}
                    className={`rounded-xl border p-3.5 text-sm leading-6 shadow-lg shadow-black/10 ${
                      message.role === "user"
                        ? "ml-6 border-violet-400/20 bg-violet-500/10 text-violet-100"
                        : "mr-2 border-white/[0.08] bg-[#101326]/80 text-slate-300"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {suggestedCode && (
                      <button
                        type="button"
                        onClick={() => ide.applySuggestedCode(suggestedCode)}
                        className="mt-3 rounded-lg border border-violet-400/20 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-400/10"
                      >
                        Use suggested code
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/[0.06] p-3">
              <button
                type="button"
                onClick={ide.requestAnalysis}
                className="ide-ai-button flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-100"
              >
                <span aria-hidden="true" className="text-base text-cyan-300">
                  ✦
                </span>
                Analyze current code
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <PanelTitle>GitHub push</PanelTitle>
            <div className="ide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-3.5">
              {isGithubConnected ? (
                <form
                  onSubmit={submitGithubPush}
                  className="space-y-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                >
                  <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
                      <GitHubLogo />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {user?.gitHubUsername || "GitHub account"}
                      </p>
                      <p className="text-xs text-emerald-400">Connected</p>
                    </div>
                  </div>

                  <label className="block text-xs font-medium text-slate-400">
                    Repository
                    <input
                      value={ide.githubRepository}
                      onChange={(event) =>
                        ide.setGithubRepository(event.target.value)
                      }
                      placeholder="owner/repository"
                      required
                      className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-400/40"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-medium text-slate-400">
                      Branch
                      <input
                        value={ide.githubBranch}
                        onChange={(event) =>
                          ide.setGithubBranch(event.target.value)
                        }
                        placeholder="main"
                        className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-400/40"
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-400">
                      File path
                      <input
                        value={ide.githubPath}
                        onChange={(event) =>
                          ide.setGithubPath(event.target.value)
                        }
                        placeholder={ide.file}
                        required
                        className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-400/40"
                      />
                    </label>
                  </div>

                  <label className="block text-xs font-medium text-slate-400">
                    Commit message
                    <input
                      value={ide.commitMessage}
                      onChange={(event) =>
                        ide.setCommitMessage(event.target.value)
                      }
                      required
                      className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-400/40"
                    />
                  </label>

                  {ide.pushError && (
                    <p role="alert" className="text-xs leading-5 text-rose-400">
                      {ide.pushError}
                    </p>
                  )}
                  {ide.pushStatus === "success" && (
                    <p className="text-xs leading-5 text-emerald-400">
                      Code pushed successfully.
                      {ide.pushedUrl && (
                        <a
                          href={ide.pushedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 underline underline-offset-2"
                        >
                          View on GitHub
                        </a>
                      )}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={ide.pushStatus === "pushing"}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-violet-400/30 hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <GitHubLogo />
                    {ide.pushStatus === "pushing"
                      ? "Pushing..."
                      : "Push current file"}
                  </button>
                </form>
              ) : (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                  <p className="text-sm leading-6 text-slate-400">
                    Connect GitHub to push the current file to a repository.
                  </p>
                  <button
                    type="button"
                    onClick={() => loginWithGithub("/ide")}
                    className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/[0.1]"
                  >
                    <GitHubLogo />
                    Connect GitHub
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default IDE;
