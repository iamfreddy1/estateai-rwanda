// ============================================
// NAVBAR COMPONENT (Rwanda + Dark Mode)
// ============================================

import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { toggleTheme } from "../theme";

function navLinkClass({ isActive }) {
  return isActive
    ? "text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 dark:border-blue-400 pb-1"
    : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors";
}

function Navbar({
  user,
  onLoginClick,
  onSignupClick,
  onLogoutClick,
}) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  // Keep state in sync with the actual class
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function handleAddListing() {
    if (!user) onLoginClick();
    else navigate("/sell");
  }

  function handleThemeToggle() {
    const next = toggleTheme();
    setIsDark(next === "dark");
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-800/50 sticky top-0 z-40 border-b dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
          <span className="text-3xl">🏡</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">EstateAI</span>
          <span className="text-xs bg-yellow-400 text-gray-900 px-1.5 py-0.5 rounded font-bold hidden sm:inline">RW</span>
        </Link>

        {/* NAV LINKS */}
        <div className="hidden lg:flex items-center gap-6 font-medium text-sm">
          <NavLink to="/buy" className={navLinkClass}>Buy</NavLink>
          <NavLink to="/rent" className={navLinkClass}>Rent</NavLink>
          <NavLink to="/sell" className={navLinkClass}>Sell</NavLink>
          <NavLink to="/estimate-house" className={navLinkClass}>🏠 House Estimate</NavLink>
          <NavLink to="/estimate-land" className={navLinkClass}>🌳 Land Estimate</NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>📊 Dashboard</NavLink>
        </div>

        {/* AUTH AREA */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Dark mode toggle */}
          <button
            onClick={handleThemeToggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors text-lg"
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {user ? (
            <>
              <button
                onClick={handleAddListing}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-1"
              >
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">Add Listing</span>
              </button>

              <span className="text-gray-700 dark:text-gray-300 font-medium hidden md:inline text-sm">
                Hi, {user.name || user.email.split("@")[0]} 👋
              </span>
              <button
                onClick={onLogoutClick}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium px-3 py-2 rounded-lg transition-colors text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onLoginClick}
                className="text-gray-700 dark:text-gray-300 font-medium hover:text-blue-600 transition-colors text-sm hidden sm:inline"
              >
                Login
              </button>
              <button
                onClick={onSignupClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Sign Up
              </button>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
