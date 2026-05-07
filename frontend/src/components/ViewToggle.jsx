// ============================================
// VIEW TOGGLE
// ============================================
// Three-way toggle: Grid / Split / Map

function ViewToggle({ value, onChange }) {
  const options = [
    { id: "grid",  label: "🟫 Grid",  title: "Card grid only" },
    { id: "split", label: "🟫🗺 Split", title: "Cards + Map side by side" },
    { id: "map",   label: "🗺 Map",   title: "Map view only" },
  ];

  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1 text-sm font-medium">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          title={opt.title}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            value === opt.id
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default ViewToggle;
