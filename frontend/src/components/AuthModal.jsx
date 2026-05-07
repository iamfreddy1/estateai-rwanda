// ============================================
// AUTH MODAL COMPONENT
// ============================================
// Tabbed popup for Login and Signup.
// Calls the auth API helpers and notifies parent (App) when login succeeds.

import { useState } from "react";
import { loginApi, signupApi, saveAuth } from "../auth";

function AuthModal({ isOpen, onClose, onAuthSuccess, defaultTab = "login" }) {
  // Track which tab is active ("login" or "signup")
  const [tab, setTab] = useState(defaultTab);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when switching tabs
  function switchTab(newTab) {
    setTab(newTab);
    setError(null);
    setPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data =
        tab === "login"
          ? await loginApi({ email, password })
          : await signupApi({ email, password, name });

      // Save token + user to localStorage
      saveAuth(data.token, data.user);

      // Notify the parent component (App) so it can update the UI
      onAuthSuccess(data.user);

      // Reset and close
      setEmail("");
      setPassword("");
      setName("");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER + CLOSE */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {tab === "login" ? "Welcome back 👋" : "Create your account"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-3xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b mt-6">
          <button
            onClick={() => switchTab("login")}
            className={`flex-1 py-3 font-semibold transition-colors ${
              tab === "login"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchTab("signup")}
            className={`flex-1 py-3 font-semibold transition-colors ${
              tab === "signup"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Name (signup only) */}
          {tab === "signup" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={tab === "signup" ? "At least 6 characters" : "Your password"}
              minLength={6}
              required
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="border border-red-200 bg-red-50 rounded-lg px-3 py-2">
              <p className="text-red-700 text-sm">⚠️ {error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Please wait...
              </>
            ) : (
              tab === "login" ? "Login" : "Create account"
            )}
          </button>

          {/* Switch tab hint */}
          <p className="text-center text-sm text-gray-500">
            {tab === "login" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Login
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
