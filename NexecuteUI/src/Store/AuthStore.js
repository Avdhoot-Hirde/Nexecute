import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
const LOGIN_PATH = import.meta.env.VITE_AUTH_LOGIN_PATH || "/auth/login";
const REGISTER_PATH =
  import.meta.env.VITE_AUTH_REGISTER_PATH || "/auth/register";
const ME_PATH = import.meta.env.VITE_AUTH_ME_PATH || "/auth/me";
const LOGOUT_PATH = import.meta.env.VITE_AUTH_LOGOUT_PATH || "/auth/logout";
const REFRESH_PATH = import.meta.env.VITE_AUTH_REFRESH_PATH || "/auth/refresh";
const GITHUB_OAUTH_PATH =
  import.meta.env.VITE_GITHUB_OAUTH_PATH || "/oauth2/authorization/github";

let refreshRequest = null;

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const unpadded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, "=");
    const decoded = decodeURIComponent(
      window
        .atob(normalized)
        .split("")
        .map(
          (character) =>
            `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
        )
        .join(""),
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isExpired(token) {
  const payload = decodeJwtPayload(token);
  return Boolean(payload?.exp && payload.exp * 1000 <= Date.now());
}

function tokenFrom(data, response) {
  const authorization = response.headers.get("authorization");
  return (
    data?.accessToken ||
    data?.token ||
    data?.jwt ||
    data?.data?.accessToken ||
    data?.data?.token ||
    authorization?.replace(/^Bearer\s+/i, "") ||
    null
  );
}

function userFrom(data, token) {
  return data?.user || data?.data?.user || decodeJwtPayload(token) || null;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function authRequest(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(
      data.message || data.error || data.detail || "Authentication failed",
    );
  }
  return { data, response };
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async ({ userName, password }) => {
        set({ isLoading: true, error: null });
        try {
          const { data, response } = await authRequest(LOGIN_PATH, {
            method: "POST",
            body: JSON.stringify({ userName, password }),
          });
          const accessToken = tokenFrom(data, response);
          if (!accessToken)
            throw new Error("The server did not return an access token");
          const user = userFrom(data, accessToken);
          set({ accessToken, user, isAuthenticated: true, isLoading: false });
          return user;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      register: async ({ userName, email, password, confirmPassword }) => {
        set({ isLoading: true, error: null });
        try {
          const { data, response } = await authRequest(REGISTER_PATH, {
            method: "POST",
            body: JSON.stringify({ userName, email, password, confirmPassword }),
          });
          const accessToken = tokenFrom(data, response);
          if (accessToken) {
            const user = userFrom(data, accessToken);
            set({ accessToken, user, isAuthenticated: true, isLoading: false });
            return user;
          }
          set({ isLoading: false });
          return null;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      loginWithGithub: (returnTo = "/ide") => {
        sessionStorage.setItem("auth-return-to", returnTo);
        window.location.assign(apiUrl(GITHUB_OAUTH_PATH));
      },

      completeOAuthLogin: async (location = window.location) => {
        set({ isLoading: true, error: null });
        try {
          const query = new URLSearchParams(location.search);
          const oauthError = query.get("error");
          const accessToken = query.get("access_token");

          if (oauthError)
            throw new Error(query.get("error_description") || oauthError);
          if (!accessToken)
            throw new Error("GitHub sign-in completed without an access token");

          set({ accessToken, isAuthenticated: true, isLoading: false });
          await get().loadUser();
          return sessionStorage.getItem("auth-return-to") || "/ide";
        } catch (error) {
          get().clearSession();
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      loadUser: async () => {
        let { accessToken } = get();
        if (!accessToken || isExpired(accessToken)) {
          accessToken = await get().refreshAccessToken();
        }
        const { data } = await authRequest(ME_PATH, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const user = data.user || data.data || data;
        set({ user, isAuthenticated: true });
        return user;
      },

      refreshAccessToken: async () => {
        if (refreshRequest) return refreshRequest;

        refreshRequest = (async () => {
          try {
            const { data, response } = await authRequest(REFRESH_PATH, {
              method: "POST",
              // The httpOnly refresh cookie is sent via credentials: "include".
            });
            const accessToken = tokenFrom(data, response);
            if (!accessToken)
              throw new Error("The server did not return a new access token");

            set({
              accessToken,
              user: userFrom(data, accessToken) || get().user,
              isAuthenticated: true,
              error: null,
            });
            return accessToken;
          } catch (error) {
            get().clearSession();
            throw error;
          } finally {
            refreshRequest = null;
          }
        })();

        return refreshRequest;
      },

      logout: async () => {
        const { accessToken } = get();
        try {
          if (accessToken) {
            await authRequest(LOGOUT_PATH, {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
            });
          }
        } catch {
          // Local logout must still succeed if the API is unavailable.
        } finally {
          get().clearSession();
        }
      },

      clearSession: () =>
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          error: null,
        }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "nexecute-auth",
      partialize: ({ accessToken, user, isAuthenticated }) => ({
        accessToken,
        user,
        isAuthenticated,
      }),
      merge: (persisted, current) => {
        const validAccessToken =
          persisted?.accessToken && !isExpired(persisted.accessToken);
        return {
          ...current,
          ...persisted,
          accessToken: validAccessToken ? persisted.accessToken : null,
          user: validAccessToken ? persisted.user : null,
          isAuthenticated: Boolean(validAccessToken),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state?.accessToken || isExpired(state.accessToken)) {
          state.refreshAccessToken().catch(() => {});
        }
      },
    },
  ),
);

export async function authFetch(path, options = {}) {
  let { accessToken, isAuthenticated, refreshAccessToken } =
    useAuthStore.getState();

  if (isAuthenticated && (!accessToken || isExpired(accessToken))) {
    try {
      accessToken = await refreshAccessToken();
    } catch {
      accessToken = null;
    }
  }

  const sendRequest = (token) =>
    fetch(apiUrl(path), {
      credentials: "include",
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await sendRequest(accessToken);
  if (response.status === 401 && isAuthenticated) {
    try {
      accessToken = await refreshAccessToken();
      response = await sendRequest(accessToken);
    } catch {
      useAuthStore.getState().clearSession();
    }
  }
  return response;
}
