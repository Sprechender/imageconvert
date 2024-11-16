import { QualitySettings } from "@/types/image";

// Interface defining quality settings for different image formats
export interface QualityMap {
  jpeg: QualitySettings;
  webp: QualitySettings;
}

// Quality presets for different image sizes and formats
export const qualityMap: QualityMap = {
  jpeg: {
    tiny: 90,    // < 0.5MB
    small: 85,   // 0.5-1MB
    medium: 80,  // 1-2MB
    large: 70,   // 2-5MB
    xlarge: 60,  // 5-10MB
    huge: 50     // > 10MB
  },
  webp: {
    tiny: 85,    // < 0.5MB
    small: 80,   // 0.5-1MB
    medium: 75,  // 1-2MB
    large: 65,   // 2-5MB
    xlarge: 55,  // 5-10MB
    huge: 45     // > 10MB
  }
};

/**
 * Automatically determines optimal quality setting based on file size and format
 * @param file - The image file to analyze
 * @param format - The target format (webp or jpeg)
 * @returns Recommended quality value (1-100)
 */
export function getAutoQuality(file: File, format: string): number {
  const sizeInMB = file.size / (1024 * 1024);
  
  // Use webp quality settings if format is webp, otherwise use jpeg settings
  const qualities = format === 'webp' ? qualityMap.webp : qualityMap.jpeg;

  if (sizeInMB > 10) return qualities.huge;
  if (sizeInMB > 5) return qualities.xlarge;
  if (sizeInMB > 2) return qualities.large;
  if (sizeInMB > 1) return qualities.medium;
  if (sizeInMB > 0.5) return qualities.small;
  return qualities.tiny;
}

/**
 * Converts an image file to specified format and quality
 * @param file - The image file to convert
 * @param format - Target format (jpeg, webp, etc)
 * @param quality - Quality setting (1-100)
 * @returns Promise resolving to converted image Blob
 */
export async function convertImage(
  file: File,
  format: string,
  quality: number
): Promise<Blob> {
  const img = new window.Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Create temporary object URL for loading image
  const objectUrl = URL.createObjectURL(file);
  img.src = objectUrl;
  
  try {
    // Wait for image to load
    await new Promise((resolve) => (img.onload = resolve));
    canvas.width = img.width;
    canvas.height = img.height;
    ctx?.drawImage(img, 0, 0);
    
    // Convert canvas to blob with specified format and quality
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to convert image')),
        `image/${format}`,
        quality / 100
      );
    });
    
    return blob;
  } finally {
    // Clean up object URL
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Generates a preview URL for an image with specified conversion settings
 * @param file - The image file to preview
 * @param format - Target format
 * @param quality - Quality setting (1-100)
 * @returns Promise resolving to object URL for preview
 */
export async function generatePreview(
  file: File,
  format: string,
  quality: number
): Promise<string> {
  const blob = await convertImage(file, format, quality);
  return URL.createObjectURL(blob);
}