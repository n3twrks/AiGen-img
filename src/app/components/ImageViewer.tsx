'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { format } from 'date-fns';

interface SavedImage {
  id: string; // UUID
  user_id: string; // UUID
  image_url: string;
  prompt: string;
  style: string;
  created_at: string;
}

interface ImageViewerProps {
  images: SavedImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export default function ImageViewer({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: ImageViewerProps) {
  const currentImage = images[currentIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        onNavigate('next');
      }
    },
    [onClose, onNavigate, currentIndex, images.length]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentImage.prompt || 'image'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={onClose}
        >
          {/* Main content container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-5xl bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-opacity"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col md:flex-row h-[80vh]">
              {/* Image container */}
              <div className="relative flex-1 bg-gray-100 p-8">
                <img
                  src={currentImage.image_url}
                  alt={currentImage.prompt}
                  className="w-full h-full object-contain"
                />

                {/* Navigation arrows */}
                {currentIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('prev');
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-opacity"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {currentIndex < images.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('next');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-opacity"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Info sidebar */}
              <div className="w-full md:w-80 p-6 bg-white flex flex-col">
                <h3 className="text-lg font-semibold mb-2">Image Details</h3>
                
                {/* Creation date */}
                <p className="text-sm text-gray-500 mb-4">
                  Created on {format(new Date(currentImage.created_at), 'PPP')}
                </p>

                {/* Prompt */}
                <div className="flex-1 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 h-40 overflow-y-auto">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {currentImage.prompt}
                    </p>
                  </div>
                </div>

                {/* Download button */}
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Image
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 