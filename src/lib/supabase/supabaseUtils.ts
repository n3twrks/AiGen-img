import { supabase } from './supabase';

// Type for image IDs
type ImageId = string; // UUID

// Function to save an image to Supabase Storage
export const saveImageToStorage = async (imageUrl: string, userId: string): Promise<string> => {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image from URL');
    }
    const blob = await response.blob();
    
    // Create a unique filename with random string to prevent collisions
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomString}.png`;
    let filePath = `${userId}/${filename}`;
    
    console.log('Uploading to path:', filePath);

    // Try to upload the file
    let uploadResult = await supabase.storage
      .from('images')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: false,
        cacheControl: '3600'
      });

    // If there's an error and it's because the file exists, try with a new name
    if (uploadResult.error?.message === 'The resource already exists') {
      const newRandomString = Math.random().toString(36).substring(2, 15);
      const newFilename = `${timestamp}-${newRandomString}.png`;
      filePath = `${userId}/${newFilename}`;
      
      uploadResult = await supabase.storage
        .from('images')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: false,
          cacheControl: '3600'
        });
    }

    // If we still have an error after retry, throw it
    if (uploadResult.error) {
      throw new Error(`Failed to upload image: ${uploadResult.error.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    if (!publicUrl) {
      throw new Error('Failed to generate public URL for uploaded image');
    }

    console.log('Successfully uploaded image to:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error saving image to storage:', error);
    throw error;
  }
};

// Function to save image metadata to Supabase Database
export const saveImageToDatabase = async (
  userId: string,
  imageUrl: string,
  prompt: string,
  style: string
) => {
  try {
    console.log('Saving to database with URL:', imageUrl); // Debug log
    const { error } = await supabase
      .from('saved_images')
      .insert([
        {
          user_id: userId,
          image_url: imageUrl,
          prompt,
          style,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Error saving image to database:', error);
    throw error;
  }
};

// Function to get all saved images for a user
export const getSavedImages = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('saved_images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (data) {
      console.log('Retrieved images:', data); // Debug log
      // Ensure the URLs are using the correct format
      data.forEach(image => {
        console.log('Image URL:', image.image_url);
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error getting saved images:', error);
    throw error;
  }
};

// Function to search images by prompt
export const searchImages = async (userId: string, searchQuery: string) => {
  try {
    const { data, error } = await supabase
      .from('saved_images')
      .select('*')
      .eq('user_id', userId)
      .ilike('prompt', `%${searchQuery}%`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching images:', error);
    throw error;
  }
};

// Function to get sorted images
export const getSortedImages = async (
  userId: string,
  sortBy: 'created_at' | 'prompt',
  sortOrder: 'asc' | 'desc'
) => {
  try {
    const { data, error } = await supabase
      .from('saved_images')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting sorted images:', error);
    throw error;
  }
};

// Function to soft delete multiple images
export const softDeleteImages = async (imageIds: ImageId[]) => {
  try {
    const { data, error } = await supabase
      .rpc('soft_delete_images', { 
        image_ids: imageIds
      });

    if (error) {
      console.error('Soft delete error details:', error);
      throw new Error(`Failed to soft delete images: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error soft deleting images:', error);
    throw error;
  }
};

// Function to get image URLs for download
export const getImageUrls = async (imageIds: ImageId[]) => {
  try {
    const { data, error } = await supabase
      .from('saved_images')
      .select('image_url, prompt')
      .in('id', imageIds)
      .is('deleted_at', null);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting image URLs:', error);
    throw error;
  }
}; 