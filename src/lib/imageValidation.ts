/**
 * Centralized Image Validation Rules for QuickCourt
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per photo
export const MAX_GALLERY_PHOTOS_PER_BATCH = 10;
export const MAX_GALLERY_TOTAL_PHOTOS = 30;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a single image file for format and size
 */
export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return { valid: false, error: "No image file provided." };
  }

  // 1. Extension check
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file format (.${ext || "unknown"}). Allowed formats: JPG, JPEG, PNG, WEBP.`,
    };
  }

  // 2. MIME type check
  if (file.type && !ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported media type (${file.type}). Allowed formats: JPG, JPEG, PNG, WEBP.`,
    };
  }

  // 3. File size check
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File "${file.name}" is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Validates a batch of files for multi-upload
 */
export function validateImageBatch(files: File[], currentCount = 0): ValidationResult {
  if (!files || files.length === 0) {
    return { valid: false, error: "No images selected." };
  }

  if (files.length > MAX_GALLERY_PHOTOS_PER_BATCH) {
    return {
      valid: false,
      error: `You can upload up to ${MAX_GALLERY_PHOTOS_PER_BATCH} photos at a time.`,
    };
  }

  if (currentCount + files.length > MAX_GALLERY_TOTAL_PHOTOS) {
    return {
      valid: false,
      error: `Maximum gallery limit reached (${MAX_GALLERY_TOTAL_PHOTOS} photos total).`,
    };
  }

  for (const file of files) {
    const res = validateImageFile(file);
    if (!res.valid) {
      return res;
    }
  }

  return { valid: true };
}
