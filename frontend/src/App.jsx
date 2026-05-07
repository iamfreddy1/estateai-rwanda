// ============================================
// MAIN APP COMPONENT (Layout + Routes + Dark mode + Animations)
// ============================================

import { useState, useEffect } from "react";
import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AuthModal from "./components/AuthModal";
import PageTransition from "./components/PageTransition";

import Home from "./pages/Home";
import Buy from "./pages/Buy";
import Rent from "./pages/Rent";
import Sell from "./pages/Sell";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import EstimateHouse from "./pages/EstimateHouse";
import EstimateLand from "./pages/EstimateLand";
import PropertyDetails from "./pages/PropertyDetails";
import Dashboard from "./pages/Dashboard";

import { fetchMe, clearAuth, getStoredUser } from "./auth";


function Layout() {
  const [authModal, setAuthModal] = useState({ open: false, tab: "login" });
  const [user, setUser] = useState(getStoredUser());
  const location = useLocation();

  useEffect(() => {
    fetchMe().then((freshUser) => {
      if (freshUser) setUser(freshUser);
      else { clearAuth(); setUser(null); }
    });
  }, []);

  const openLogin = () => setAuthModal({ open: true, tab: "login" });
  const openSignup = () => setAuthModal({ open: true, tab: "signup" });
  const closeAuth = () => setAuthModal((s) => ({ ...s, open: false }));

  function handleLogout() {
    clearAuth();
    setUser(null);
  }

  const outletContext = { user, openLogin, openSignup };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      <Navbar
        user={user}
        onLoginClick={openLogin}
        onSignupClick={openSignup}
        onLogoutClick={handleLogout}
      />

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet context={outletContext} />
          </PageTransition>
        </AnimatePresence>
      </main>

      <Footer />

      <AuthModal
        isOpen={authModal.open}
        defaultTab={authModal.tab}
        onClose={closeAuth}
        onAuthSuccess={(loggedInUser) => setUser(loggedInUser)}
      />
    </div>
  );
}


function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/buy" element={<Buy />} />
        <Route path="/rent" element={<Rent />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/estimate-house" element={<EstimateHouse />} />
        <Route path="/estimate-land"  element={<EstimateLand />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/property/:id"   element={<PropertyDetails />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
