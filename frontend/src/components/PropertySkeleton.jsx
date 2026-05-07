// ============================================
// PROPERTY SKELETON
// ============================================
// Shimmer placeholder shown while property cards load.

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden border dark:border-gray-800">
      <div className="h-52 shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-7 w-1/3 shimmer rounded" />
        <div className="h-4 w-2/3 shimmer rounded" />
        <div className="h-3 w-1/2 shimmer rounded" />
        <div className="border-t dark:border-gray-800 pt-3 flex gap-2">
          <div className="h-3 w-12 shimmer rounded" />
          <div className="h-3 w-12 shimmer rounded" />
          <div className="h-3 w-16 shimmer rounded" />
        </div>
      </div>
    </div>
  );
}

function PropertySkeleton({ count = 6, compact = false }) {
  const cols = compact
    ? "grid-cols-1 xl:grid-cols-2"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid ${cols} gap-5`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default PropertySkeleton;
