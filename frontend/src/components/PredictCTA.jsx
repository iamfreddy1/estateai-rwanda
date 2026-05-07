// ============================================
// PREDICT CTA COMPONENT
// ============================================
// Receives onPredictClick prop from App so the big button opens the modal.

function PredictCTA({ onPredictClick }) {
  return (
    <section id="predict" className="py-16 px-6 bg-gradient-to-r from-blue-600 to-indigo-700">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">

        {/* LEFT: Icon + text */}
        <div className="flex-grow text-center md:text-left">
          <div className="text-5xl mb-3">🤖</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Get an AI-Powered Home Value
          </h2>
          <p className="text-gray-600 text-lg">
            Our Random Forest AI analyzes thousands of properties to instantly
            estimate the value of any home.
          </p>
        </div>

        {/* RIGHT: Big button - now opens the modal */}
        <div>
          <button
            onClick={onPredictClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg transition-all hover:scale-105"
          >
            Try AI Estimate →
          </button>
        </div>

      </div>
    </section>
  );
}

export default PredictCTA;
