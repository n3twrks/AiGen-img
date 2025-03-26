'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getSavedImages } from '@/lib/supabase/supabaseUtils';
import { Loader2 } from 'lucide-react';

interface SavedImage {
  id: number;
  user_id: string;
  image_url: string;
  prompt: string;
  style: string;
  created_at: string;
}

export default function LibraryPage() {
  const ITEMS_PER_PAGE = 12;
  const { user } = useAuth();
  const [images, setImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchImages = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const data = await getSavedImages(user.id);
        setImages(data);
      } catch (err) {
        setError('Failed to load images. Please try again later.');
        console.error('Error fetching images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [user]);

  // Calculate total pages
  const totalPages = Math.ceil(images.length / ITEMS_PER_PAGE);

  // Get items for current page
  const paginatedImages = images.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="p-8 h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="mt-2 text-gray-500">Loading your library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 h-screen flex flex-col items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 h-screen flex flex-col">
      {/* Library Title stays at the top left */}
      <h1 className="text-3xl font-bold mb-4">Library</h1>

      {/* Centered and scrollable image grid */}
      <div className="flex-grow flex justify-center items-center overflow-hidden">
        <div className="max-w-screen-lg w-full max-h-[80vh] overflow-auto p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {paginatedImages.map((image) => (
              <div key={image.id} className="flex flex-col">
                {/* Image */}
                <div className="aspect-square w-full bg-gray-200 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                  {image.image_url ? (
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-12 h-12 text-gray-400"
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
                  )}
                </div>
                {/* Image name/prompt */}
                <p className="text-sm text-gray-600 truncate" title={image.prompt}>
                  {image.prompt || `Image ${image.id}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-gray-100 rounded">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
