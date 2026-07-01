"use client";

import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  authClient,
  clearStoredCsrfToken,
  type AuthPayload,
  type AuthUser,
  getCsrfCookie,
  storeCsrfToken,
  type ProfileUpdateInput,
} from "@/lib/auth-client";

type AuthContextValue = {
  accessToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { displayName: string; email: string; password: string }) => Promise<void>;
  verifyEmail: (input: { email: string; code: string }) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (input: { email: string; code: string; newPassword: string }) => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  beginOAuth: (provider: "google") => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function scheduleRefresh(expiresAt: string, callback: () => void) {
  const refreshAt = new Date(expiresAt).getTime() - Date.now() - 60_000;
  return window.setTimeout(callback, Math.max(refreshAt, 5_000));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);
  const refreshSessionRef = useRef<() => Promise<void>>(async () => {});

  const clearAuthState = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    clearStoredCsrfToken();
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const applyPayload = useCallback((payload: AuthPayload) => {
    setAccessToken(payload.access_token);
    setUser(payload.user);
    storeCsrfToken(payload.csrf_token);
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = scheduleRefresh(payload.expires_at, () => {
      startTransition(() => {
        void refreshSessionRef.current();
      });
    });
  }, []);

  const refreshSession = useCallback(async () => {
    const csrfToken = getCsrfCookie();
    if (!csrfToken) {
      clearAuthState();
      return;
    }

    try {
      const payload = await authClient.refresh(csrfToken);
      applyPayload(payload);
    } catch {
      clearAuthState();
    }
  }, [applyPayload, clearAuthState]);

  refreshSessionRef.current = refreshSession;

  useEffect(() => {
    startTransition(() => {
      void (async () => {
        await refreshSession();
        setIsLoading(false);
      })();
    });

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [refreshSession]);

  const value: AuthContextValue = {
    accessToken,
    user,
    isLoading,
    async login(input) {
      const payload = await authClient.login(input);
      applyPayload(payload);
    },
    async register(input) {
      const payload = await authClient.register(input);
      applyPayload(payload);
    },
    async verifyEmail(input) {
      await authClient.verifyEmail(input);
    },
    async resendVerification(email) {
      await authClient.resendVerification(email);
    },
    async forgotPassword(email) {
      await authClient.forgotPassword(email);
    },
    async resetPassword(input) {
      await authClient.resetPassword(input);
    },
    async updateProfile(input) {
      if (!accessToken) {
        throw new Error("You must be logged in to update your profile.");
      }
      const updated = await authClient.updateProfile(accessToken, input);
      setUser(updated);
    },
    async logout() {
      if (accessToken) {
        try {
          await authClient.logout(accessToken);
        } catch {
          // Ignore API errors during client-side cleanup.
        }
      }
      clearAuthState();
    },
    async logoutAll() {
      if (accessToken) {
        try {
          await authClient.logoutAll(accessToken);
        } catch {
          // Ignore API errors during client-side cleanup.
        }
      }
      clearAuthState();
    },
    async beginOAuth(provider) {
      const payload = await authClient.getOAuthUrl(provider);
      window.location.href = payload.authorization_url;
    },
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
