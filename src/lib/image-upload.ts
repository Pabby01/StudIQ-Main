import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

// Image validation utilities
export const IMAGE_VALIDATION = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  MAX_WIDTH: 2000,
  MAX_HEIGHT: 2000,
} as const;

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an image file before upload
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check file type
  const allowedTypes = IMAGE_VALIDATION.ALLOWED_TYPES as readonly string[];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.'
    };
  }

  // Check file size
  if (file.size > IMAGE_VALIDATION.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 5MB.'
    };
  }

  return { isValid: true };
}

/**
 * Validates image dimensions using a canvas approach (Browser-only)
 * This function should only be used in client-side code
 */
export async function validateImageDimensions(file: File): Promise<ImageValidationResult> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    // In server environment, skip dimension validation for now
    // This could be enhanced with a server-side image processing library
    return { isValid: true };
  }

  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      if (img.width > IMAGE_VALIDATION.MAX_WIDTH || img.height > IMAGE_VALIDATION.MAX_HEIGHT) {
        resolve({
          isValid: false,
          error: `Image dimensions too large. Maximum dimensions are ${IMAGE_VALIDATION.MAX_WIDTH}x${IMAGE_VALIDATION.MAX_HEIGHT}px.`
        });
      } else {
        resolve({ isValid: true });
      }
    };
    
    img.onerror = () => {
      resolve({
        isValid: false,
        error: 'Failed to load image for dimension validation.'
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Comprehensive image validation
 * Falls back to basic validation on server-side
 */
export async function validateImage(file: File): Promise<ImageValidationResult> {
  // Basic file validation (always works)
  const fileValidation = validateImageFile(file);
  if (!fileValidation.isValid) {
    return fileValidation;
  }

  // Dimension validation (browser-only, safe for server-side)
  try {
    const dimensionValidation = await validateImageDimensions(file);
    if (!dimensionValidation.isValid) {
      return dimensionValidation;
    }
  } catch (error) {
    // If dimension validation fails (e.g., server-side), log but don't fail
    console.warn('Dimension validation skipped (server-side)', error);
  }

  return { isValid: true };
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets the appropriate error message for upload errors
 */
export function getUploadErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'FILE_TOO_LARGE') {
      return 'File is too large. Maximum size is 5MB.';
    }
    
    if (error.code === 'INVALID_FILE_TYPE') {
      return 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.';
    }
  }
  
  return 'Failed to upload image. Please try again.';
}