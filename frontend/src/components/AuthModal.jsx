// ============================================
// AUTH MODAL (production polish)
// ============================================
// Three modes in one modal: login / signup / forgot.
// Adds: show/hide password, remember-me, inline validation, loading spinner,
// enter-to-submit (via <form>), keyboard ESC to close, accessible focus.
import { useEffect, useState } from "react";
import {
  loginApi, signupApi, saveAuth,
  forgotPasswordApi, resetPasswordApi,
  getRememberedEmail, setRememberedEmail, clearRememberedEmail,
} from "../auth";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthModal({ isOpen, onClose, onAuthSuccess, defaultTab = "login" }) {
  const [mode, setMode] = useState(defaultTab);     // 'login' | 'signup' | 'forgot'
  const [forgotStep, setForgotStep] = useState(1);   // 1 = enter email, 2 = enter code + new pw

  // ---- fields ----
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ---- UI state ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  // Prefill remembered email on first open
  useEffect(() => {
    if (!isOpen) return;
    const remembered = getRememberedEmail();
    if (remembered) { setEmail(remembered); setRemember(true); }
  }, [isOpen]);

  // ESC closes
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  function reset() {
    setError(null); setInfo(null);
    setPassword(""); setCode(""); setNewPassword("");
    if (!remember) setEmail("");
  }
  function switchMode(next) { setMode(next); setForgotStep(1); reset(); }

  // ---- validation helpers ----
  function validateAuth() {
    if (!emailRe.test(email.trim())) return "Enter a valid email address.";
    if (mode === "signup" && password.length < 6) return "Password must be at least 6 characters.";
    if (mode === "login" && !password) return "Enter your password.";
    return null;
  }

  // ---- login / signup submit ----
  async function handleAuthSubmit(e) {
    e.preventDefault();
    const v = validateAuth();
    if (v) { setError(v); return; }
    setLoading(true); setError(null);
    try {
      const data = mode === "login"
        ? await loginApi({ email: email.trim().toLowerCase(), password })
        : await signupApi({ email: email.trim().toLowerCase(), password, name: name.trim() });
      saveAuth(data.token, data.user);
      remember ? setRememberedEmail(email.trim().toLowerCase()) : clearRememberedEmail();
      onAuthSuccess(data.user);
      reset(); onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---- forgot password: step 1 (send code) ----
  async function handleSendCode(e) {
    e.preventDefault();
    if (!emailRe.test(email.trim())) { setError("Enter a valid email."); return; }
    setLoading(true); setError(null); setInfo(null);
    try {
      await forgotPasswordApi(email.trim().toLowerCase());
      setInfo("If that email is registered, a 6-digit reset code is on its way. Check your inbox (or the backend console in dev).");
      setForgotStep(2);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  // ---- forgot password: step 2 (verify code + set password) ----
  async function handleReset(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) { setError("Code is a 6-digit number."); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    setLoading(true); setError(null);
    try {
      await resetPasswordApi({ email: email.trim().toLowerCase(), code: code.trim(), newPassword });
      setInfo("Password reset! Please log in with your new password.");
      setTimeout(() => switchMode("login"), 1500);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800"
           onClick={(e) => e.stopPropagation()}>

        {/* Tabs (hidden in forgot mode) */}
        {mode !== "forgot" ? (
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {[["login", "Login"], ["signup", "Sign Up"]].map(([k, l]) => (
              <button key={k} onClick={() => switchMode(k)}
                className={`flex-1 py-3 font-semibold transition-colors ${
                  mode === k
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}>{l}</button>
            ))}
          </div>
        ) : (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <button onClick={() => switchMode("login")}
              className="text-sm text-blue-600 hover:underline">← Back to login</button>
          </div>
        )}

        <div className="p-6">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-1">
            {mode === "login" && "Welcome back 👋"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && (forgotStep === 1 ? "Reset password" : "Enter reset code")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {mode === "login" && "Sign in to continue to EstateAI Rwanda."}
            {mode === "signup" && "Join the smartest real estate platform in Kigali."}
            {mode === "forgot" && forgotStep === 1 && "We'll email you a 6-digit code."}
            {mode === "forgot" && forgotStep === 2 && "Type the 6-digit code we sent + your new password."}
          </p>

          {/* ============== LOGIN / SIGNUP FORM ============== */}
          {mode !== "forgot" && (
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Name (optional)</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your name" autoComplete="name" disabled={loading}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="you@example.com" autoComplete="email" disabled={loading} autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    disabled={loading}
                    className="w-full px-3 py-2 pr-20 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} tabIndex={-1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Row: Remember me  +  Forgot password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500" />
                  Remember me
                </label>
                {mode === "login" && (
                  <button type="button" onClick={() => switchMode("forgot")}
                    className="text-blue-600 hover:underline font-semibold">Forgot password?</button>
                )}
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">⚠️  {error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition-colors">
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === "login" ? "Logging in…" : "Creating account…"}
                  </>
                ) : (mode === "login" ? "Log in" : "Create account")}
              </button>
            </form>
          )}

          {/* ============== FORGOT PASSWORD — STEP 1 ============== */}
          {mode === "forgot" && forgotStep === 1 && (
            <form onSubmit={handleSendCode} className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                  placeholder="you@example.com" disabled={loading}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">⚠️ {error}</p>}
              {info && <p className="text-blue-700 text-sm bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg">{info}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
                {loading ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending…</> : "Send reset code"}
              </button>
            </form>
          )}

          {/* ============== FORGOT PASSWORD — STEP 2 ============== */}
          {mode === "forgot" && forgotStep === 2 && (
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">6-digit code</label>
                <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus
                  placeholder="000000"
                  className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">New password</label>
                <input type={showPassword ? "text" : "password"} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} required
                  placeholder="At least 6 characters" autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">⚠️ {error}</p>}
              {info && <p className="text-green-700 text-sm bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg">{info}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
                {loading ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Resetting…</> : "Reset password"}
              </button>
              <button type="button" onClick={() => setForgotStep(1)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Didn't get a code? Try again
              </button>
            </form>
          )}

          {/* Footer line — switch between login and signup */}
          {mode === "login" && (
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              New here?{" "}
              <button onClick={() => switchMode("signup")}
                className="text-blue-600 hover:underline font-semibold">Create an account</button>
            </p>
          )}
          {mode === "signup" && (
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <button onClick={() => switchMode("login")}
                className="text-blue-600 hover:underline font-semibold">Log in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
