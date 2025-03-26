'use client';

export default function LibraryPage() {
  // Placeholder data - will be replaced with actual data from database later
  const placeholders = Array(12).fill(null).map((_, i) => ({
    id: i,
    name: `Image ${i + 1}`,
  }));

  return (
    <div className="p-8 h-screen flex flex-col">
      {/* Library Title stays at the top left */}
      <h1 className="text-3xl font-bold mb-4">Library</h1>

      {/* Centered and scrollable image grid */}
      <div className="flex-grow flex justify-center items-center overflow-hidden">
        <div className="max-w-screen-lg w-full max-h-[80vh] overflow-auto p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {placeholders.map((item) => (
              <div key={item.id} className="flex flex-col">
                {/* Image placeholder */}
                <div className="aspect-square w-full bg-gray-200 rounded-lg overflow-hidden mb-2 flex items-center justify-center text-gray-400">
                  <svg
                    className="w-12 h-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                {/* Image name */}
                <p className="text-sm text-gray-600 truncate">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
