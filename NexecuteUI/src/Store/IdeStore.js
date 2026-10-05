import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authFetch } from "./AuthStore";

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
];

const initialLanguage = IDE_LANGUAGES[0];
let ideSocket = null;

function normalizeHistory(payload) {
  const items = payload?.history || payload?.data || payload;
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    id: item.id || `${item.createdAt || "run"}-${index}`,
    language: item.language || "python",
    code: item.code || "",
    status: item.status || "done",
    createdAt: item.createdAt || item.timestamp,
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
      setFile: (file) => set({file}),
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

      addHistoryItem: (entry) =>
        set((state) => ({
          history: [
            {
              id: `${Date.now()}-${Math.random()}`,
              createdAt: new Date().toISOString(),
              ...entry,
            },
            ...state.history,
          ],
        })),

      loadHistory: async () => {
        set({ historyLoading: true });
        try {
          const response = await authFetch(HISTORY_PATH);
          if (!response.ok) throw new Error("History is unavailable");
          set({ history: normalizeHistory(await responseData(response)) });
        } catch {
          // The editor remains usable when the optional history API is unavailable.
        } finally {
          set({ historyLoading: false });
        }
      },

      connectSocket: () => {
        if (!WEBSOCKET_URL || ideSocket) return;
        const socket = new WebSocket(WEBSOCKET_URL);
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
          if (["stdout", "output"].includes(message.type)) {
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
        const shouldReplaceCode =
          !state.code.trim() || state.code === previous?.snippet;
        const shouldReplacePath =
          !state.githubPath || state.githubPath === previous?.file;
        set({
          language: next.value,
          file: next.file,
          code: shouldReplaceCode ? next.snippet : state.code,
          githubPath: shouldReplacePath ? next.file : state.githubPath,
        });
      },

      runCode: async () => {
        const state = get();
        if (state.status === "running") return;
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
            }),
          });
          const data = await responseData(response);
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
          get().addHistoryItem({
            language: state.language,
            code: state.code,
            status: "done",
          });
        } catch (error) {
          get().appendConsole(error.message || "Execution failed", "error");
          set({ status: "error", awaitingInput: false });
          get().addHistoryItem({
            language: state.language,
            code: state.code,
            status: "error",
          });
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
        if (!item.code) return;
        const language = IDE_LANGUAGES.find(
          (entry) => entry.value === item.language,
        );
        set({
          language: item.language,
          file: language?.file || get().file,
          code: item.code,
        });
      },

      applySuggestedCode: (code) => set({ code }),

      pushToGithub: async () => {
        const state = get();
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
