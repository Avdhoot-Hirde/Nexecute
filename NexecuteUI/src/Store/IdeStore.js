import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authFetch, useAuthStore } from "./AuthStore";

const EXECUTE_PATH =
  import.meta.env.VITE_IDE_EXECUTE_PATH ||
  import.meta.env.VITE_EXECUTE_PATH ||
  "/api/trial/execute";
const HISTORY_PATH = import.meta.env.VITE_IDE_HISTORY_PATH || "/api/history";
const GITHUB_PUSH_PATH =
  import.meta.env.VITE_GITHUB_PUSH_PATH || "/api/github/push";
const WEBSOCKET_URL = import.meta.env.VITE_IDE_WEBSOCKET_URL;

export const IDE_LANGUAGES = [
  {
    value: "python",
    label: "Python",
    file: "Solution.py",
    snippet: "print('Hello World!!')",
  },
  {
    value: "java",
    label: "Java",
    file: "Solution.java",
    snippet: `class Solution {
  public static void main(String[] args) {
    System.out.println("Hello World!!");
  }
}`,
  },
  {
    value: "cpp",
    label: "C++",
    file: "Solution.cpp",
    snippet: `#include <iostream>

int main() {
  std::cout << "Hello World!!" << std::endl;
  return 0;
}`,
  },
  {
    value: "javascript",
    label: "JavaScript",
    file: "Solution.js",
    snippet: "console.log('Hello World!!');",
  },
  {
    value: "c", label: "C", file: "Solution.c",
    snippet: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello World!!\\n");\n  return 0;\n}',
  },
  {
    value: "go", label: "Go", file: "Solution.go",
    snippet: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello World!!")\n}',
  },
  {
    value: "rust", label: "Rust", file: "Solution.rs",
    snippet: 'fn main() {\n  println!("Hello World!!");\n}',
  },
  {
    value: "ruby", label: "Ruby", file: "Solution.rb",
    snippet: 'puts "Hello World!!"',
  },
  {
    value: "php", label: "PHP", file: "Solution.php",
    snippet: '<?php\necho "Hello World!!\\n";',
  },
  {
    value: "typescript", label: "TypeScript", file: "Solution.ts",
    snippet: 'const greeting: string = "Hello World!!";\nconsole.log(greeting);',
  },
];

const initialLanguage = IDE_LANGUAGES[0];
let ideSocket = null;
let historyRequest = 0;
const historyIdentity = state => state.user?.id || state.user?.sub || state.user?.userName || state.isAuthenticated;

function normalizeHistory(payload) {
  const items = payload?.history || payload?.data || payload;
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    id: item.id || `${item.createdAt || "run"}-${index}`,
    language: item.language || "python",
    code: item.code || "",
    fileName: item.fileName || item.file,
    status: item.status || "done",
    createdAt: item.createdAt || item.timestamp || item.lastEdit,
  }));
}

async function responseData(response) {
  return response.json().catch(() => ({}));
}

export const useIdeStore = create(
  persist(
    (set, get) => ({
      language: initialLanguage.value,
      file: initialLanguage.file,
      code: initialLanguage.snippet,
      stdin: "",
      consoleEntry: "",
      consoleLines: [
        {
          type: "muted",
          text: "Nexecute terminal ready. Run your code to begin.\n",
        },
      ],
      status: "idle",
      history: [],
      historyLoading: true,
      historyError: null,
      socketState: WEBSOCKET_URL ? "connecting" : "http",
      awaitingInput: false,
      executionMode: null,
      assistantMessages: [
        {
          id: "welcome",
          role: "assistant",
          text: "Run or analyze your code and I'll surface suggestions here.",
        },
      ],
      githubRepository: "",
      githubBranch: "main",
      githubPath: initialLanguage.file,
      commitMessage: "Add solution from Nexecute",
      pushStatus: "idle",
      pushError: null,
      pushedUrl: null,

      setCode: (code) => set({ code }),
      setFile: (file) => set((state) => ({
        file,
        githubPath: state.githubPath === state.file ? file : state.githubPath,
        pushError: null,
        pushedUrl: null,
      })),
      setConsoleEntry: (consoleEntry) => set({ consoleEntry }),
      setStdin: (stdin) => set({ stdin }),
      setConsoleLines: (consoleLines) => set({ consoleLines }),
      setGithubRepository: (githubRepository) =>
        set({ githubRepository, pushError: null, pushedUrl: null }),
      setGithubBranch: (githubBranch) =>
        set({ githubBranch, pushError: null, pushedUrl: null }),
      setGithubPath: (githubPath) =>
        set({ githubPath, pushError: null, pushedUrl: null }),
      setCommitMessage: (commitMessage) =>
        set({ commitMessage, pushError: null, pushedUrl: null }),

      appendConsole: (text, type = "output") => {
        if (text === undefined || text === null || text === "") return;
        // Output arrives in arbitrary chunks, not necessarily complete lines.
        set((state) => ({
          consoleLines: [...state.consoleLines, { type, text: String(text) }],
        }));
      },

      addHistoryItem: (entry) => {
        if (!entry?.id) return;
        historyRequest += 1;
        const normalized = normalizeHistory([entry])[0];
        set((state) => ({
          history: [normalized, ...state.history.filter(item => item.id !== entry.id)],
          historyLoading: false,
          historyError: null,
        }));
      },

      loadHistory: async () => {
        const request = ++historyRequest;
        set({ historyLoading: true, historyError: null });
        try {
          const response = await authFetch(HISTORY_PATH);
          if (!response.ok) throw new Error("History is unavailable");
          const entries = normalizeHistory(await responseData(response));
          if (request === historyRequest) set({ history: entries });
        } catch (error) {
          if (request === historyRequest) set({ history: [], historyError: error.message });
        } finally {
          if (request === historyRequest) set({ historyLoading: false });
        }
      },

      connectSocket: () => {
        if (!WEBSOCKET_URL || ideSocket) return;
        const socketUrl = new URL(WEBSOCKET_URL, window.location.href);
        const token = useAuthStore.getState().accessToken;
        if (token) socketUrl.searchParams.set("token", token);
        const socket = new WebSocket(socketUrl);
        ideSocket = socket;
        set({ socketState: "connecting" });

        socket.addEventListener("open", () => {
          if (ideSocket === socket) set({ socketState: "connected" });
        });
        const connectionLost = () => {
          if (ideSocket !== socket) return;
          if (get().status === "running" && get().executionMode === "socket") {
            get().appendConsole("\nConnection lost. Run the program again.\n", "error");
            set({ status: "error" });
          }
          set({ socketState: "disconnected", awaitingInput: false });
        };
        socket.addEventListener("close", () => {
          if (ideSocket === socket) {
            connectionLost();
            ideSocket = null;
          }
        });
        socket.addEventListener("error", connectionLost);
        socket.addEventListener("message", (event) => {
          if (ideSocket !== socket) return;
          let message;
          try {
            message = JSON.parse(event.data);
          } catch {
            message = { type: "stdout", data: event.data };
          }

          if (!message || typeof message !== "object") return;
          const text = message.data ?? message.output ?? message.message ?? "";
          if (message.type === "history") {
            get().addHistoryItem(message.entry);
          } else if (message.type === "history_error") {
            set({ historyError: text });
          } else if (["stdout", "output"].includes(message.type)) {
            get().appendConsole(text);
          } else if (message.type === "stderr") {
            get().appendConsole(text, "error");
          } else if (message.type === "input") {
            if (get().status !== "running" || get().executionMode !== "socket") return;
            get().appendConsole(text, "prompt");
            set({ awaitingInput: true });
          } else if (["assistant", "analysis"].includes(message.type)) {
            set((state) => ({
              assistantMessages: [
                ...state.assistantMessages,
                { id: `${Date.now()}`, role: "assistant", text },
              ],
            }));
          } else if (message.type === "status") {
            const nextStatus =
              message.status === "completed" ? "done" : message.status;
            set({
              awaitingInput: nextStatus === "running" ? get().awaitingInput : false,
              status: ["idle", "running", "done", "error"].includes(
                nextStatus,
              )
                ? nextStatus
                : "idle",
            });
          }
        });
      },

      disconnectSocket: () => {
        if (!ideSocket) return;
        const socket = ideSocket;
        ideSocket = null;
        socket.close();
        set({
          socketState: "disconnected",
          awaitingInput: false,
          status: get().executionMode === "socket" && get().status === "running"
            ? "error" : get().status,
        });
      },

      initialize: () => {
        get().loadHistory();
        get().connectSocket();
      },

      changeLanguage: (nextLanguage) => {
        const state = get();
        const previous = IDE_LANGUAGES.find(
          (item) => item.value === state.language,
        );
        const next = IDE_LANGUAGES.find(
          (item) => item.value === nextLanguage,
        );
        if (!next) return;
        const shouldReplacePath =
          !state.githubPath || state.githubPath === previous?.file;
        set({
          language: next.value,
          file: next.file,
          code: next.snippet,
          githubPath: shouldReplacePath ? next.file : state.githubPath,
        });
      },

      runCode: async () => {
        const state = get();
        const historyOwner = historyIdentity(useAuthStore.getState());
        if (state.status === "running") return;
        if (state.socketState === "connecting") {
          get().appendConsole("Connecting to the live terminal. Wait for Live connection before running.\n", "muted");
          return;
        }
        set({
          status: "running",
          awaitingInput: false,
          consoleEntry: "",
          executionMode: ideSocket?.readyState === WebSocket.OPEN ? "socket" : "http",
          consoleLines: [
            { type: "command", text: `$ run ${state.language}\n` },
            { type: "muted", text: "Compiling and starting process...\n" },
          ],
        });

        if (ideSocket?.readyState === WebSocket.OPEN) {
          try {
            ideSocket.send(
              JSON.stringify({
                type: "execute",
                language: state.language,
                file: state.file,
                code: state.code,
                stdin: "",
              }),
            );
          } catch {
            get().appendConsole("Unable to start execution. Run the program again.\n", "error");
            set({ status: "error", awaitingInput: false });
          }
          return;
        }

        try {
          const response = await authFetch(EXECUTE_PATH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: state.language,
              code: state.code,
              stdin: state.stdin,
              file: state.file,
            }),
          });
          const data = await responseData(response);
          if (historyOwner === historyIdentity(useAuthStore.getState())) {
            if (data.history) get().addHistoryItem(data.history);
            if (data.historyError) set({ historyError: data.historyError });
          }
          if (!response.ok) {
            throw new Error(
              data.stderr || data.error || data.message || "Execution failed",
            );
          }
          get().appendConsole(
            data.stdout || data.output || "Process completed with no output.",
          );
          if (data.stderr) get().appendConsole(data.stderr, "error");
          set({ status: "done", awaitingInput: false });
        } catch (error) {
          get().appendConsole(error.message || "Execution failed", "error");
          set({ status: "error", awaitingInput: false });
        }
      },

      submitConsoleInput: () => {
        const { consoleEntry, status, executionMode } = get();
        if (status !== "running" || executionMode !== "socket" ||
            ideSocket?.readyState !== WebSocket.OPEN) return;
        try {
          // One message represents one submitted line, including an empty line.
          ideSocket.send(JSON.stringify({ type: "stdin", data: consoleEntry }));
          get().appendConsole(`${consoleEntry}\n`, "command");
          set({ consoleEntry: "", awaitingInput: false });
        } catch {
          get().appendConsole("\nUnable to send input. Run the program again.\n", "error");
          set({ status: "error", awaitingInput: false });
        }
      },

      requestAnalysis: () => {
        const state = get();
        const selectedLanguage = IDE_LANGUAGES.find(
          (item) => item.value === state.language,
        );
        set((current) => ({
          assistantMessages: [
            ...current.assistantMessages,
            {
              id: `${Date.now()}-user`,
              role: "user",
              text: `Review my ${selectedLanguage?.label} code.`,
            },
          ],
        }));

        if (ideSocket?.readyState === WebSocket.OPEN) {
          ideSocket.send(
            JSON.stringify({
              type: "analyze",
              language: state.language,
              code: state.code,
            }),
          );
        } else {
          set((current) => ({
            assistantMessages: [
              ...current.assistantMessages,
              {
                id: `${Date.now()}-offline`,
                role: "assistant",
                text: "AI analysis needs VITE_IDE_WEBSOCKET_URL and a connected backend.",
              },
            ],
          }));
        }
      },

      loadHistoryItem: (item) => {
        if (item.code == null || get().status === "running") return false;
        const language = IDE_LANGUAGES.find(
          (entry) => entry.value === item.language,
        );
        set({
          language: item.language,
          file: item.fileName || item.file || language?.file || get().file,
          githubPath: item.fileName || item.file || language?.file || get().file,
          code: item.code,
          stdin: "",
          consoleEntry: "",
          status: "idle",
          awaitingInput: false,
          executionMode: null,
          consoleLines: [{ type: "muted", text: "Saved code loaded. Run it to execute again.\n" }],
        });
        return true;
      },

      applySuggestedCode: (code) => set({ code }),

      pushToGithub: async () => {
        const state = get();
        if (state.pushStatus === "pushing") return null;
        const repository = state.githubRepository.trim();
        const branch = state.githubBranch.trim() || "main";
        const path = state.githubPath.trim();
        const message = state.commitMessage.trim();

        if (!repository || !repository.includes("/")) {
          set({
            pushStatus: "error",
            pushError: "Enter a repository as owner/repository.",
          });
          return null;
        }
        if (!path) {
          set({ pushStatus: "error", pushError: "Enter a file path." });
          return null;
        }
        if (!message) {
          set({ pushStatus: "error", pushError: "Enter a commit message." });
          return null;
        }

        set({ pushStatus: "pushing", pushError: null, pushedUrl: null });
        try {
          const response = await authFetch(GITHUB_PUSH_PATH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repository,
              branch,
              path,
              message,
              content: state.code,
              language: state.language,
            }),
          });
          const data = await responseData(response);
          if (!response.ok) {
            throw new Error(
              data.message || data.error || "Unable to push code to GitHub.",
            );
          }
          const pushedUrl =
            data.htmlUrl || data.url || data.content?.html_url || null;
          set({ pushStatus: "success", pushError: null, pushedUrl });
          return data;
        } catch (error) {
          set({
            pushStatus: "error",
            pushError: error.message || "Unable to push code to GitHub.",
          });
          return null;
        }
      },
    }),
    {
      name: "nexecute-ide",
      partialize: ({
        language,
        file,
        code,
        stdin,
        githubRepository,
        githubBranch,
        githubPath,
        commitMessage,
      }) => ({
        language,
        file,
        code,
        stdin,
        githubRepository,
        githubBranch,
        githubPath,
        commitMessage,
      }),
    },
  ),
);

// History belongs to the authenticated account, never to browser persistence.
useAuthStore.subscribe?.((state, previous) => {
  if (state.isAuthenticated !== previous.isAuthenticated || historyIdentity(state) !== historyIdentity(previous)) {
    historyRequest += 1;
    const reconnect = Boolean(ideSocket) && state.isAuthenticated;
    useIdeStore.getState().disconnectSocket();
    useIdeStore.setState({ history: [], historyLoading: false, historyError: null });
    if (reconnect) useIdeStore.getState().connectSocket();
  }
});
