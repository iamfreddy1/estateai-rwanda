// ============================================
// ADMIN GUARD  (renders children only if user.is_admin)
// ============================================
import { Link } from "react-router-dom";
import { getStoredUser } from "../../auth";

export default function AdminGuard({ children }) {
  const user = getStoredUser();
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 rounded-2xl bg-white dark:bg-gray-900 shadow border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">🔒 Sign in required</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Please log in to access the admin area.</p>
        <Link to="/" className="text-blue-600 hover:underline">← Home</Link>
      </div>
    );
  }
  if (!user.is_admin) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 rounded-2xl bg-white dark:bg-gray-900 shadow border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">🚫 Admins only</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-1">Your account doesn't have admin rights.</p>
        <p className="text-xs text-gray-500 mb-4">Need access? Ask the system owner to promote your account.</p>
        <Link to="/" className="text-blue-600 hover:underline">← Back to home</Link>
      </div>
    );
  }
  return children;
}
