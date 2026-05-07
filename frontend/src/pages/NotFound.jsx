// ============================================
// NOT FOUND PAGE (404)
// ============================================
// Catch-all route shown when no other route matches.

import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-700 mb-2">Page not found</p>
        <p className="text-gray-500 mb-6">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
