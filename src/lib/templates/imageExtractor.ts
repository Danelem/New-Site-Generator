/**
 * Utility functions to extract image metadata from templates
 */

export interface ImageMetadata {
  src?: string; // Current placeholder image URL
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  context?: string; // Surrounding text/elements for context
}

/**
 * Extract image metadata from an HTML element with data-slot attribute
 */
export function extractImageMetadata(htmlBody: string, slotId: string): ImageMetadata | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlBody, "text/html");
    const imgElement = doc.querySelector(`img[data-slot="${slotId}"]`) as HTMLImageElement;
    
    if (!imgElement) {
      return null;
    }

    const metadata: ImageMetadata = {
      src: imgElement.src || imgElement.getAttribute("src") || undefined,
      alt: imgElement.alt || undefined,
      className: imgElement.className || undefined,
    };

    // Extract dimensions from attributes or styles
    const widthAttr = imgElement.getAttribute("width");
    const heightAttr = imgElement.getAttribute("height");
    
    if (widthAttr) {
      metadata.width = parseInt(widthAttr, 10);
    }
    if (heightAttr) {
      metadata.height = parseInt(heightAttr, 10);
    }

    // Try to get dimensions from computed styles (if available in browser context)
    // Note: This won't work in server-side parsing, but we can try
    if (typeof window !== "undefined") {
      try {
        const computedStyle = window.getComputedStyle(imgElement);
        const width = computedStyle.width;
        const height = computedStyle.height;
        if (width && width !== "auto" && !metadata.width) {
          metadata.width = parseInt(width, 10);
        }
        if (height && height !== "auto" && !metadata.height) {
          metadata.height = parseInt(height, 10);
        }
      } catch (e) {
        // Ignore errors in server-side context
      }
    }

    // Extract context (parent element text or nearby headings)
    const parent = imgElement.parentElement;
    if (parent) {
      // Look for nearby heading
      let current: Element | null = parent;
      for (let i = 0; i < 3 && current; i++) {
        const heading = current.querySelector("h1, h2, h3, h4, h5, h6");
        if (heading) {
          metadata.context = heading.textContent?.trim() || undefined;
          break;
        }
        current = current.parentElement;
      }
      
      // If no heading found, use parent's text content (first 50 chars)
      if (!metadata.context && parent.textContent) {
        const text = parent.textContent.trim();
        if (text.length > 0) {
          metadata.context = text.substring(0, 50).replace(/\s+/g, " ");
        }
      }
    }

    return metadata;
  } catch (error) {
    console.error("Error extracting image metadata:", error);
    return null;
  }
}

/**
 * Extract all image slots metadata from a template
 */
export function extractAllImageMetadata(htmlBody: string, imageSlotIds: string[]): Record<string, ImageMetadata> {
  const metadata: Record<string, ImageMetadata> = {};
  
  for (const slotId of imageSlotIds) {
    const imgMetadata = extractImageMetadata(htmlBody, slotId);
    if (imgMetadata) {
      metadata[slotId] = imgMetadata;
    }
  }
  
  return metadata;
}

