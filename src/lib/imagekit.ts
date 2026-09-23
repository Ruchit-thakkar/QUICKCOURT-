/**
 * ImageKit Configuration and URL Transformation Utilities for QuickCourt
 */

export interface ImageKitTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  crop?: "maintain_ratio" | "force" | "pad_resize" | "at_least";
  format?: "auto" | "webp" | "jpg" | "png";
  blur?: number;
}

export const IMAGE_PRESETS = {
  // Discovery Cards & Venue Cards
  CARD: { width: 700, height: 400, quality: 80, crop: "maintain_ratio" as const, format: "auto" as const },
  // Gallery thumbnails & profile previews
  THUMB: { width: 260, height: 260, quality: 75, crop: "maintain_ratio" as const, format: "auto" as const },
  // Venue Hero Banner
  HERO: { width: 1400, height: 700, quality: 85, format: "auto" as const },
  // Lightbox Fullscreen Viewer
  FULLSCREEN: { width: 1600, height: 1200, quality: 90, format: "auto" as const },
  // Business Logo
  LOGO: { width: 240, height: 240, quality: 85, crop: "maintain_ratio" as const, format: "auto" as const },
};

/**
 * Transforms an ImageKit CDN URL with responsive dimensions, crop, and quality.
 * Returns the original URL if not an ImageKit URL or if already formatted.
 */
export function getImageKitUrl(
  url?: string | null,
  options?: ImageKitTransformOptions
): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // If not an ImageKit URL, return as-is
  if (!trimmed.includes("ik.imagekit.io")) {
    return trimmed;
  }

  if (!options) return trimmed;

  const transforms: string[] = [];
  if (options.width) transforms.push(`w-${options.width}`);
  if (options.height) transforms.push(`h-${options.height}`);
  if (options.quality) transforms.push(`q-${options.quality}`);
  if (options.crop) transforms.push(`c-${options.crop}`);
  if (options.format) transforms.push(`f-${options.format}`);
  if (options.blur) transforms.push(`bl-${options.blur}`);

  if (transforms.length === 0) return trimmed;

  // Clean existing transformation params if present
  const [base, queryStr] = trimmed.split("?");
  const trParam = `tr=${transforms.join(",")}`;

  if (!queryStr) {
    return `${base}?${trParam}`;
  }

  // Filter out any previous tr= param
  const queryParts = queryStr.split("&").filter((p) => !p.startsWith("tr="));
  queryParts.push(trParam);
  return `${base}?${queryParts.join("&")}`;
}

/**
 * Generates structured ImageKit storage folder path
 */
export function getImageKitFolderPath(
  businessId: string,
  photoType: "logo" | "cover" | "gallery"
): string {
  const cleanBizId = (businessId || "default").replace(/[^a-zA-Z0-9_-]/g, "");
  return `/quickcourt/businesses/${cleanBizId}/${photoType}`;
}

/**
 * Generates unique, collision-safe filename
 */
export function generateImageFilename(
  businessId: string,
  photoType: string,
  originalFilename = "image.jpg"
): string {
  const cleanBizId = (businessId || "biz").replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = (originalFilename || "image.jpg").split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${cleanBizId}_${photoType}_${timestamp}_${randomSuffix}.${ext}`;
}

/**
 * Server-only ImageKit instance initialization
 */
export function getServerImageKitInstance() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error(
      "Missing ImageKit credentials. Ensure IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT are set."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ImageKit = require("imagekit");
  return new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  });
}
