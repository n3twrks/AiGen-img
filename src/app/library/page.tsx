'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getSavedImages, searchImages, getSortedImages, softDeleteImages, getImageUrls } from '@/lib/supabase/supabaseUtils';
import { Loader2, Download, Trash2, Search, ChevronDown, ArrowLeft, ArrowRight, Eye, X } from 'lucide-react';
import JSZip from 'jszip';
import ImageViewer from '@/app/components/ImageViewer';

interface SavedImage {
  id: string; // UUID
  user_id: string; // UUID
  image_url: string;
  prompt: string;
  style: string;
  created_at: string;
}

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

// Debounce helper function
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook to get window size
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize(); // Call once to set initial size
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return windowSize;
}

// Function to calculate items per page based on screen width
function getItemsPerPage(width: number) {
  if (width >= 1536) return 15; // 2xl: 5 columns x 3 rows
  if (width >= 1280) return 12; // xl: 4 columns x 3 rows
  if (width >= 1024) return 12; // lg: 4 columns x 3 rows
  if (width >= 768) return 9;   // md: 3 columns x 3 rows
  if (width >= 640) return 6;   // sm: 2 columns x 3 rows
  return 3;                     // xs: 1 column x 3 rows
}

export default function LibraryPage() {
  const { width } = useWindowSize();
  const itemsPerPage = getItemsPerPage(width);
  const { user } = useAuth();
  const [images, setImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInputValue, setSearchInputValue] = useState('');
  const searchQuery = useDebounce(searchInputValue, 500); // 0.5 second delay
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Handle select/deselect all
  const handleSelectAll = () => {
    const allImageIds = new Set(images.map(img => img.id));
    setSelectedImages(allImageIds);
  };

  const handleDeselectAll = () => {
    setSelectedImages(new Set());
  };

  // Fetch images based on sort only (removed search from this effect)
  useEffect(() => {
    const fetchImages = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const [sortField, sortOrder] = sortBy === 'newest' 
          ? ['created_at', 'desc']
          : sortBy === 'oldest'
            ? ['created_at', 'asc']
            : sortBy === 'name_asc'
              ? ['prompt', 'asc']
              : ['prompt', 'desc'];
        
        const data = await getSortedImages(user.id, sortField as 'created_at' | 'prompt', sortOrder as 'asc' | 'desc');
        setImages(data);
        setCurrentPage(1); // Reset to first page when sort changes
      } catch (err) {
        setError('Failed to load images. Please try again later.');
        console.error('Error fetching images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [user, sortBy]); // Removed searchQuery from dependencies

  // Filter images based on search query
  const filteredImages = useMemo(() => {
    if (!searchQuery) return images;
    
    const query = searchQuery.toLowerCase();
    return images.filter(image => 
      image.prompt.toLowerCase().includes(query) ||
      image.id.toLowerCase().includes(query)
    );
  }, [images, searchQuery]);

  // Calculate total pages based on filtered images
  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Get items for current page from filtered images
  const paginatedImages = filteredImages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewImage = (index: number) => {
    // Calculate the actual index across all filtered images
    const actualIndex = (currentPage - 1) * itemsPerPage + index;
    setCurrentImageIndex(actualIndex);
    setIsViewerOpen(true);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      // If we're at the first image of a page, go to the previous page
      if (currentImageIndex % itemsPerPage === 0) {
        setCurrentPage(prev => Math.max(prev - 1, 1));
      }
    } else if (direction === 'next' && currentImageIndex < filteredImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      // If we're at the last image of a page, go to the next page
      if ((currentImageIndex + 1) % itemsPerPage === 0) {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
      }
    }
  };

  // Handle bulk download
  const handleDownload = async () => {
    if (selectedImages.size === 0) return;
    
    try {
      setIsProcessing(true);
      const imageIds = Array.from(selectedImages);
      const imagesToDownload = await getImageUrls(imageIds);
      
      const zip = new JSZip();
      
      // Add each image to the zip
      const fetchPromises = imagesToDownload.map(async (img, index) => {
        try {
          const response = await fetch(img.image_url);
          const blob = await response.blob();
          const fileName = `${img.prompt || `image_${index}`}.png`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download image: ${img.image_url}`, error);
        }
      });
      
      await Promise.all(fetchPromises);
      
      // Generate and download zip
      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'selected_images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Error downloading images:', error);
      setError('Failed to download images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk delete
  const handleDelete = async () => {
    if (selectedImages.size === 0) return;
    
    if (!confirm('Are you sure you want to delete the selected images? They will be permanently deleted after 30 days.')) {
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null); // Clear any previous errors
      const imageIds = Array.from(selectedImages);
      
      const result = await softDeleteImages(imageIds);
      
      if (result.success) {
        // Remove deleted images from the state
        setImages(prevImages => prevImages.filter(img => !selectedImages.has(img.id)));
        setSelectedImages(new Set());
      }
    } catch (error) {
      console.error('Error deleting images:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

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
    <div className="p-8 min-h-screen max-h-screen flex flex-col overflow-hidden">
      {/* Page Title */}
      <h1 className="text-3xl font-bold mb-6">Library</h1>

      {/* Main content container - centers everything */}
      <div className="p-8 flex flex-col items-center flex-1 overflow-hidden">
        {/* Controls Section - same max width as image grid */}
        <div className="w-full max-w-screen-lg">
          <div className="flex flex-col space-y-4 mb-6">
            {/* Search and Sort controls */}
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search images..."
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchInputValue && (
                  <button
                    onClick={() => setSearchInputValue('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            {/* Selection controls and bulk actions with pagination */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Pagination - Always visible */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-2 text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Selection controls */}
                <div className="flex items-center space-x-4 ml-4">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Deselect All
                  </button>
                  {selectedImages.size > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedImages.size} selected
                    </span>
                  )}
                </div>
              </div>

              {/* Bulk actions */}
              {selectedImages.size > 0 && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleDownload}
                    disabled={isProcessing}
                    className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isProcessing}
                    className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image grid */}
        <div className="w-full max-w-screen-lg overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {paginatedImages.map((image, index) => (
              <div key={image.id} className="flex flex-col group relative">
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-20">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id)}
                    onChange={() => toggleImageSelection(image.id)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* View button */}
                <button
                  onClick={() => handleViewImage(index)}
                  className="absolute top-2 right-2 z-20 p-2 bg-black bg-opacity-50 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye className="w-4 h-4" />
                </button>
                
                {/* Image container with inner border */}
                <div className="relative aspect-square w-full bg-gray-200 rounded-lg overflow-hidden mb-2">
                  {/* Selection overlay */}
                  {selectedImages.has(image.id) && (
                    <div className="absolute inset-0 ring-4 ring-inset ring-blue-500 rounded-lg z-10 pointer-events-none" />
                  )}
                  
                  {/* Image */}
                  <div className="w-full h-full flex items-center justify-center">
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

      {/* Image Viewer */}
      <ImageViewer
        images={filteredImages}
        currentIndex={currentImageIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
