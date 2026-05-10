// ============================================
// AUTH CONTEXT
// ============================================
// Provides logged-in user + auth functions to the whole app.
// Wraps the App in <AuthProvider>; any screen uses useAuth().

import { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  loginApi,
  signupApi,
  fetchMeApi,
  googleAuthApi,
  saveAuth,
  clearAuth,
  getStoredUser,
  getStoredToken,
} from "../api/auth";
import { connectChatSocket, disconnectChatSocket } from "../sockets/chatSocket";
import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from "../services/pushNotifications";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);  // true while we check token at startup

  // On app launch: check if there's a saved token + verify it
  useEffect(() => {
    (async () => {
      try {
        // Show stored user instantly (so navbar etc. snap immediately)
        const cached = await getStoredUser();
        if (cached) setUser(cached);
        // Then verify the token is still valid
        const fresh = await fetchMeApi();
        if (fresh) {
          setUser(fresh);
          // Reconnect chat socket if we have a valid token
          const tk = await getStoredToken();
          if (tk) connectChatSocket(tk);
          // Refresh push token registration in case it changed
          registerForPushNotifications();
        } else {
          await clearAuth();
          setUser(null);
        }
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const data = await loginApi({ email, password });
    await saveAuth(data.token, data.user);
    setUser(data.user);
    connectChatSocket(data.token);
    registerForPushNotifications();        // fire-and-forget
    return data.user;
  }

  async function signup(email, password, name) {
    const data = await signupApi({ email, password, name });
    await saveAuth(data.token, data.user);
    setUser(data.user);
    connectChatSocket(data.token);
    registerForPushNotifications();
    return data.user;
  }

  async function loginWithGoogle(idToken) {
    const data = await googleAuthApi(idToken);
    await saveAuth(data.token, data.user);
    setUser(data.user);
    connectChatSocket(data.token);
    registerForPushNotifications();
    return data.user;
  }

  async function refreshUser() {
    const fresh = await fetchMeApi();
    if (fresh) {
      setUser(fresh);
    } else {
      // Token expired or user deleted -> log them out
      await clearAuth();
      setUser(null);
      disconnectChatSocket();
    }
    return fresh;
  }

  // Re-check session whenever app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && user) refreshUser();
    });
    return () => sub.remove();
  }, [user]);

  async function logout() {
    // Best-effort: tell backend to forget this device
    try { await unregisterPushNotifications(); } catch {}
    disconnectChatSocket();
    await clearAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, bootstrapping, login, signup, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
