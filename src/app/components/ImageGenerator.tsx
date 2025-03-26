'use client';

import React, { useState } from 'react';
import { Loader2, Download, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveImageToStorage, saveImageToDatabase } from '@/lib/supabase/supabaseUtils';
import Notification from './Notification';

interface GeneratedImage {
  url: string;
}

export default function ImageGenerator() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    setError('');
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/fal/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      if (!data.imageUrl) {
        throw new Error('No image URL received from server');
      }
      
      setGeneratedImage({ url: data.imageUrl });
      setError('');
    } catch (err) {
      console.error('Error generating image:', err);
      setGeneratedImage(null);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage?.url) return;

    try {
      const response = await fetch(generatedImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download image');
    }
  };

  const handleLike = async () => {
    if (!user || !generatedImage?.url) return;

    setIsSaving(true);
    try {
      // Save image to Supabase Storage
      const storageUrl = await saveImageToStorage(generatedImage.url, user.id);
      
      // Save metadata to Supabase Database
      await saveImageToDatabase(user.id, storageUrl, prompt, 'default');

      setNotification({
        message: 'Image saved successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving image:', error);
      setNotification({
        message: 'Failed to save image. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto h-auto p-6">
      <div className="flex flex-col items-center gap-6">
        <div className="flex-1 w-full max-w-2xl">
          {/* Zone de saisie */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 text-center">What do you want to draw?</h2>
            <div className="relative">
              <textarea
                className="w-full pr-12 px-4 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors duration-200 min-h-[100px] resize-none"
                placeholder="Describe your imagination here... Be specific about details, style, and atmosphere you want to create."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              {prompt && (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="absolute top-3 right-3 p-2 bg-[#27272a] text-white rounded-lg hover:bg-[#19c4fc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
          <br></br>

          {/* Zone d'affichage de l'image */}
          <div className="relative w-full aspect-square max-w-[600px] max-h-[400px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">

            {generatedImage ? (
              <>
                <img
                  src={generatedImage.url}
                  alt="Generated image"
                  className="max-w-[90%] max-h-[90%] object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={handleLike}
                    disabled={isSaving}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Heart className={`h-5 w-5 ${isSaving ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-400">Generated image will appear here</p>
            )}
          </div>

          {error && (
            <div className="mt-4 text-red-500 text-sm">{error}</div>
          )}
        </div>

        {/* Section des images récentes */}
        {/*
        <div className="w-full max-w-2xl mx-auto mt-6">
          <h2 className="text-lg font-light mb-2">Recent Generations</h2>
          <div className="overflow-x-auto whitespace-nowrap flex gap-4 p-2">
           {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
            key={i}
            className="w-24 h-24 bg-gray-100 rounded-lg shrink-0"
            />
            ))}
          </div>
        </div> */}
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
} 