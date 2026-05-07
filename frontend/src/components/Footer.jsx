// ============================================
// FOOTER (Rwanda + Dark mode)
// ============================================

import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-black text-gray-300 py-12 px-6 border-t dark:border-gray-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏡</span>
            <span className="text-xl font-bold text-white">EstateAI</span>
            <span className="text-xs bg-yellow-400 text-gray-900 px-1.5 py-0.5 rounded font-bold">RW</span>
          </div>
          <p className="text-sm leading-relaxed">
            Smart real estate platform powered by AI. Built for Rwanda 🇷🇼 — focused on Kigali properties.
          </p>
        </div>

        {/* Explore */}
        <div>
          <h4 className="text-white font-semibold mb-3 uppercase text-xs tracking-wider">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/buy" className="hover:text-white transition-colors">Buy</Link></li>
            <li><Link to="/rent" className="hover:text-white transition-colors">Rent</Link></li>
            <li><Link to="/sell" className="hover:text-white transition-colors">Sell</Link></li>
            <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
          </ul>
        </div>

        {/* AI Tools */}
        <div>
          <h4 className="text-white font-semibold mb-3 uppercase text-xs tracking-wider">AI Tools</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/estimate-house" className="hover:text-white transition-colors">🏠 House Estimate</Link></li>
            <li><Link to="/estimate-land" className="hover:text-white transition-colors">🌳 Land Estimate</Link></li>
          </ul>
        </div>

        {/* Districts */}
        <div>
          <h4 className="text-white font-semibold mb-3 uppercase text-xs tracking-wider">Districts</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/buy?district=Gasabo" className="hover:text-white transition-colors">Gasabo</Link></li>
            <li><Link to="/buy?district=Kicukiro" className="hover:text-white transition-colors">Kicukiro</Link></li>
            <li><Link to="/buy?district=Nyarugenge" className="hover:text-white transition-colors">Nyarugenge</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-10 pt-6 text-center text-xs text-gray-500">
        © 2026 EstateAI Rwanda. Built with Flask, React, and scikit-learn.
      </div>
    </footer>
  );
}

export default Footer;
