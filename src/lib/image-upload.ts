export function validateImageFile(_file: File): { valid: boolean; isValid: boolean; error?: string } {
  return { valid: true, isValid: true };
}

export function getUploadErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Failed to upload image';
}

export const validateImage = validateImageFile;
