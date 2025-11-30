import { supabaseService } from './supabase';
import { Database } from '../types/database';

// Use the already created service role client for storage operations
export const storageClient = supabaseService;

/**
 * Utility function to convert a date/time to Saudi Arabia timezone
 */
export const convertToSaudiTime = (date: Date): Date => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const saudiTime = new Date(utc + (3600000 * 3)); // UTC+3 for Saudi Arabia
  return saudiTime;
};

/**
 * Upload image to Supabase storage
 * @param file - File object to upload
 * @param bucketName - Name of the storage bucket
 * @param fileName - Name for the uploaded file (optional, auto-generated if not provided)
 */
export const uploadImageToStorage = async (
  file: File,
  bucketName: string,
  fileName?: string
): Promise<string | null> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate file size (limit to 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size exceeds 5MB limit');
  }

  // Generate unique filename if none provided
  if (!fileName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'jpg';
    fileName = `${timestamp}_${randomString}.${extension}`;
  }

  // Upload file to storage
  const { data, error } = await storageClient.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = storageClient.storage.from(bucketName).getPublicUrl(data.path);
  
  return urlData.publicUrl;
};

/**
 * Delete image from Supabase storage
 * @param imageUrl - Public URL of the image to delete
 * @param bucketName - Name of the storage bucket
 */
export const deleteImageFromStorage = async (imageUrl: string, bucketName: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const pathStartIndex = imageUrl.indexOf(`${bucketName}/`) + bucketName.length + 1;
    const pathEndIndex = imageUrl.lastIndexOf('?') > 0 ? imageUrl.lastIndexOf('?') : imageUrl.length;
    const filePath = imageUrl.substring(pathStartIndex, pathEndIndex);

    const { error } = await storageClient.storage.from(bucketName).remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};