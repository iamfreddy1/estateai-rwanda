// Generic placeholder for pages we haven't built yet.
import { Link } from "react-router-dom";

function ComingSoon({ title = "Coming Soon", emoji = "🚧" }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md text-center">
        <div className="text-6xl mb-4">{emoji}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-6">This page is under construction.</p>
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

export default ComingSoon;
