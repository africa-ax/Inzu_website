/**
 * SUPABASE STORAGE INTEGRATION
 * 
 * This standalone file integrates Supabase storage with your existing Firebase website.
 * It handles profile photos (public) and documents (private) without modifying existing files.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Add this script to your HTML pages that need storage functionality:
 *    <script type="module" src="supabase.js"></script>
 * 
 * 2. Make sure you've created these buckets in Supabase Dashboard:
 *    - profile-photos (public bucket)
 *    - documents (private bucket)
 * 
 * USAGE EXAMPLES:
 * 
 * // Upload profile photo
 * const photoFile = document.getElementById('photoInput').files[0];
 * const photoUrl = await SupabaseStorage.uploadProfilePhoto(photoFile, 'user123');
 * 
 * // Upload document
 * const docFile = document.getElementById('docInput').files[0];
 * const docUrl = await SupabaseStorage.uploadDocument(docFile, 'engineer456');
 * 
 * // Get signed URL for admin to view private document
 * const signedUrl = await SupabaseStorage.getSignedDocumentUrl('path/to/document.pdf');
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

// Initialize Supabase client
const supabaseUrl = 'https://kvjchhtnkprmippsoasp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2amNoaHRua3BybWlwcHNvYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTg2NDIsImV4cCI6MjA3OTA3NDY0Mn0.ms9Aw14B8ce59eMUyPm2WG1cfiPlzHQWqUIk5lvW0-o';

const supabase = createClient(supabaseUrl, supabaseKey);

// Bucket names
const BUCKETS = {
  PROFILE_PHOTOS: 'profile-photos',
  DOCUMENTS: 'documents'
};

/**
 * Main SupabaseStorage object - contains all storage functions
 */
const SupabaseStorage = {
  
  /**
   * Upload a profile photo to the public profile-photos bucket
   * 
   * @param {File} file - The image file to upload
   * @param {string} userId - Unique identifier for the user (e.g., Firebase UID or custom ID)
   * @param {string} folder - Optional subfolder (default: 'profiles')
   * @returns {Promise<string>} - Public URL of the uploaded photo
   * 
   * @example
   * const file = document.getElementById('photoInput').files[0];
   * const url = await SupabaseStorage.uploadProfilePhoto(file, 'user123');
   * console.log('Photo uploaded:', url);
   */
  uploadProfilePhoto: async (file, userId, folder = 'profiles') => {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP)');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 5MB');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${userId}_${timestamp}.${fileExt}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(BUCKETS.PROFILE_PHOTOS)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKETS.PROFILE_PHOTOS)
        .getPublicUrl(fileName);

      console.log('✅ Profile photo uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('❌ Error uploading profile photo:', error);
      throw error;
    }
  },

  /**
   * Upload a document to the private documents bucket
   * 
   * @param {File} file - The document file to upload (PDF, image, etc.)
   * @param {string} userId - Unique identifier for the user
   * @param {string} folder - Optional subfolder (default: 'certificates')
   * @returns {Promise<Object>} - Object containing path and metadata
   * 
   * @example
   * const file = document.getElementById('docInput').files[0];
   * const result = await SupabaseStorage.uploadDocument(file, 'engineer456');
   * console.log('Document uploaded:', result.path);
   */
  uploadDocument: async (file, userId, folder = 'certificates') => {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 10MB');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${userId}_${timestamp}.${fileExt}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(BUCKETS.DOCUMENTS)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      console.log('✅ Document uploaded successfully:', data.path);
      
      return {
        path: data.path,
        fullPath: data.fullPath,
        id: data.id,
        bucket: BUCKETS.DOCUMENTS
      };

    } catch (error) {
      console.error('❌ Error uploading document:', error);
      throw error;
    }
  },

  /**
   * Generate a signed URL for accessing a private document
   * This is useful for admins to view uploaded certificates/documents
   * 
   * @param {string} filePath - The path to the file in the documents bucket
   * @param {number} expiresIn - URL expiry time in seconds (default: 3600 = 1 hour)
   * @returns {Promise<string>} - Signed URL that expires after the specified time
   * 
   * @example
   * const signedUrl = await SupabaseStorage.getSignedDocumentUrl('certificates/engineer456_1234567890.pdf');
   * window.open(signedUrl, '_blank');
   */
  getSignedDocumentUrl: async (filePath, expiresIn = 3600) => {
    try {
      if (!filePath) {
        throw new Error('No file path provided');
      }

      const { data, error } = await supabase.storage
        .from(BUCKETS.DOCUMENTS)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw error;
      }

      console.log('✅ Signed URL generated successfully');
      return data.signedUrl;

    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      throw error;
    }
  },

  /**
   * Delete a profile photo from the public bucket
   * 
   * @param {string} filePath - The path to the file (e.g., 'profiles/user123_1234567890.jpg')
   * @returns {Promise<boolean>} - True if deleted successfully
   * 
   * @example
   * await SupabaseStorage.deleteProfilePhoto('profiles/user123_1234567890.jpg');
   */
  deleteProfilePhoto: async (filePath) => {
    try {
      const { error } = await supabase.storage
        .from(BUCKETS.PROFILE_PHOTOS)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      console.log('✅ Profile photo deleted successfully');
      return true;

    } catch (error) {
      console.error('❌ Error deleting profile photo:', error);
      throw error;
    }
  },

  /**
   * Delete a document from the private bucket
   * 
   * @param {string} filePath - The path to the file
   * @returns {Promise<boolean>} - True if deleted successfully
   * 
   * @example
   * await SupabaseStorage.deleteDocument('certificates/engineer456_1234567890.pdf');
   */
  deleteDocument: async (filePath) => {
    try {
      const { error } = await supabase.storage
        .from(BUCKETS.DOCUMENTS)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      console.log('✅ Document deleted successfully');
      return true;

    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  },

  /**
   * List all files in a specific folder
   * 
   * @param {string} bucket - The bucket name ('profile-photos' or 'documents')
   * @param {string} folder - The folder path (e.g., 'profiles' or 'certificates')
   * @returns {Promise<Array>} - Array of file objects
   * 
   * @example
   * const files = await SupabaseStorage.listFiles('documents', 'certificates');
   * console.log('Files:', files);
   */
  listFiles: async (bucket, folder = '') => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw error;
      }

      console.log(`✅ Listed ${data.length} files from ${bucket}/${folder}`);
      return data;

    } catch (error) {
      console.error('❌ Error listing files:', error);
      throw error;
    }
  },

  /**
   * Helper function to extract file path from Supabase public URL
   * 
   * @param {string} publicUrl - The full public URL from Supabase
   * @returns {string} - The file path
   * 
   * @example
   * const path = SupabaseStorage.extractPathFromUrl('https://...supabase.co/storage/v1/object/public/profile-photos/profiles/user123.jpg');
   * console.log(path); // 'profiles/user123.jpg'
   */
  extractPathFromUrl: (publicUrl) => {
    try {
      const url = new URL(publicUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('public');
      if (bucketIndex !== -1 && bucketIndex + 2 < pathParts.length) {
        return pathParts.slice(bucketIndex + 2).join('/');
      }
      throw new Error('Invalid Supabase URL format');
    } catch (error) {
      console.error('❌ Error extracting path from URL:', error);
      throw error;
    }
  }
};

// Make SupabaseStorage available globally
window.SupabaseStorage = SupabaseStorage;

// Export for ES modules
export default SupabaseStorage;
export { supabase, BUCKETS };

console.log('✅ Supabase Storage initialized successfully');
console.log('📦 Buckets configured:', BUCKETS);
console.log('🔧 Usage: window.SupabaseStorage or import SupabaseStorage from "./supabase.js"');
