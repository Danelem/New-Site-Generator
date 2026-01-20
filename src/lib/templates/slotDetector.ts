/**
 * Slot Detection Utility
 * Automatically detects content slots in HTML templates
 * Used during template extraction and editing
 * 
 * IMPORTANT: This preserves the original HTML structure exactly.
 * We only add data-slot attributes - we do NOT change the original HTML tags.
 */

import type { TemplateSlot } from "./uploadedTypes";

/**
 * Automatically detect and mark all content slots in HTML
 * Returns the updated HTML with data-slot attributes and the detected slots
 * 
 * This matches the original TemplateUploadPanel logic to ensure compatibility.
 */
export function detectSlots(htmlBody: string): { 
  htmlBody: string; 
  slots: TemplateSlot[] 
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlBody, "text/html");
  const body = doc.body;

  const getTextPreview = (text: string, maxLen: number = 40): string => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return "";
    return trimmed.length > maxLen ? trimmed.substring(0, maxLen) + "..." : trimmed;
  };

  // Find all content elements in document order (headings, paragraphs, lists, images)
  // Process them individually to preserve exact structure
  const processedElements = new Set<Element>();
  const slots: { element: Element; label: string; index: number; type: TemplateSlot["type"] }[] = [];
  
  // Counters for descriptive labeling - track each heading level separately
  let h1Count = 0;
  let h2Count = 0;
  let h3Count = 0;
  let h4Count = 0;
  let h5Count = 0;
  let h6Count = 0;
  let paragraphCount = 0;
  let listCount = 0;
  let imageCount = 0;
  let slotIndex = 0;

  // Walk through all elements in document order
  // IMPORTANT: Process individual elements (headings, paragraphs, lists) FIRST
  // Only treat containers as content blocks if they don't contain already-processed elements
  const walkElements = (parent: Element) => {
    const children = Array.from(parent.children);
    
    for (const el of children) {
      if (processedElements.has(el)) continue;
      
      const tag = el.tagName.toUpperCase();
      const text = el.textContent?.trim() || "";
      
      // Skip empty elements and non-content elements
      if (text.length === 0 && tag !== "IMG") {
        // Recursively process children
        walkElements(el);
        continue;
      }
      
      // Process headings individually FIRST (before checking containers)
      // PRESERVE ORIGINAL TAG: If original has <h1>, keep it as <h1>. If <h2>, keep as <h2>, etc.
      // Label clearly shows the tag type so user knows exactly which section they're editing
      if (tag.match(/^H[1-6]$/)) {
        const level = parseInt(tag[1]);
        let label = "";
        
        if (level === 1) {
          h1Count++;
          label = `H1 Heading ${h1Count}`;
        } else if (level === 2) {
          h2Count++;
          label = `H2 Subheading ${h2Count}`;
        } else if (level === 3) {
          h3Count++;
          label = `H3 Section Header ${h3Count}`;
        } else if (level === 4) {
          h4Count++;
          label = `H4 Subsection ${h4Count}`;
        } else if (level === 5) {
          h5Count++;
          label = `H5 Minor Header ${h5Count}`;
        } else {
          h6Count++;
          label = `H6 Minor Header ${h6Count}`;
        }
        
        // Store the original element - its tag (H1, H2, H3, etc.) will be preserved exactly
        slots.push({
          element: el,
          label: label,
          index: slotIndex++,
          type: "text"
        });
        processedElements.add(el);
        continue; // Don't process children of headings
      }
      // Process paragraphs individually FIRST
      // PRESERVE ORIGINAL TAG: If original has <p>, keep it as <p>
      else if (tag === "P" && text.length >= 10) {
        paragraphCount++;
        const label = `Paragraph ${paragraphCount}`;
        
        // Store the original element - its tag (P) will be preserved exactly
        slots.push({
          element: el,
          label: label,
          index: slotIndex++,
          type: "text"
        });
        processedElements.add(el);
        continue; // Don't process children of paragraphs
      }
      // Process lists individually FIRST
      else if (tag === "UL" || tag === "OL") {
        listCount++;
        const label = `List ${listCount}`;
        
        slots.push({
          element: el,
          label: label,
          index: slotIndex++,
          type: "list"
        });
        processedElements.add(el);
        continue; // Don't process children of lists
      }
      // Process images individually FIRST
      else if (tag === "IMG") {
        imageCount++;
        const label = `Image ${imageCount}`;
        
        slots.push({
          element: el,
          label: label,
          index: slotIndex++,
          type: "image"
        });
        processedElements.add(el);
        continue; // Images don't have children
      }
      // For DIV, SECTION, ARTICLE - check if it's a content-rich container
      // BUT only if it doesn't contain already-processed individual elements
      else if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") {
        // Check if this container has any already-processed individual elements
        const hasProcessedChildren = Array.from(el.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol, img")).some(
          child => processedElements.has(child)
        );
        
        // If it has processed children, just recursively process the remaining children
        if (hasProcessedChildren) {
          walkElements(el);
          continue;
        }
        
        // Check if this container has substantial content (multiple paragraphs, headings, etc.)
        const hasHeadings = el.querySelector("h1, h2, h3, h4, h5, h6");
        const paragraphs = el.querySelectorAll("p");
        const hasMultipleParagraphs = paragraphs.length >= 2;
        const hasLists = el.querySelector("ul, ol");
        const directText = Array.from(el.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent?.trim())
          .join(" ")
          .trim();
        
        // Only treat as content block if it's a SMALL, self-contained section
        // (like a product review card, not the entire page)
        // Criteria: Has heading + multiple paragraphs, BUT also check it's not too large
        // We want to avoid treating the entire page as one content block
        const childElementCount = el.children.length;
        const isSmallContainer = childElementCount <= 10; // Reasonable size for a content block
        
        const isContentBlock = isSmallContainer && (
          (hasHeadings && hasMultipleParagraphs && paragraphs.length <= 5) || // Small card with heading + few paragraphs
          (hasMultipleParagraphs && paragraphs.length >= 3 && paragraphs.length <= 5) || // Small section with few paragraphs
          (directText.length >= 100 && directText.length < 500 && !hasHeadings && paragraphs.length === 0) // Small text block
        );
        
        if (isContentBlock) {
          // This is a small content block (like a product review card)
          paragraphCount++; // Reuse paragraph counter for content blocks
          const headingText = hasHeadings 
            ? getTextPreview(hasHeadings.textContent || "", 30)
            : "";
          const label = headingText 
            ? `Content Block ${paragraphCount}: ${headingText}`
            : `Content Block ${paragraphCount}`;
          
          slots.push({
            element: el,
            label: label,
            index: slotIndex++,
            type: "text"
          });
          processedElements.add(el);
          // Mark all children as processed so they don't get extracted separately
          el.querySelectorAll("*").forEach(child => processedElements.add(child));
        } else {
          // Not a content block, recursively process children to find individual elements
          walkElements(el);
        }
      } else {
        // For other tags, recursively process children
        walkElements(el);
      }
    }
  };
  
  // Start walking from body
  walkElements(body);

  // Add data-slot attributes and create template slots
  // IMPORTANT: We only add data-slot attributes - we do NOT change the original HTML tags
  // If original has <h1>, it stays <h1>. If original has <h2>, it stays <h2>. If original has <p>, it stays <p>.
  // The structure and tag types are preserved exactly as they appear in the source.
  const templateSlots: TemplateSlot[] = [];
  slots.forEach((slot) => {
    // Use the original slot ID format: slot_0, slot_1, etc.
    const slotId = `slot_${slot.index}`;
    
    // Add data-slot attribute to the element WITHOUT changing its tag or structure
    // Original tag (H1, H2, H3, P, UL, etc.) is preserved exactly
    slot.element.setAttribute("data-slot", slotId);

    templateSlots.push({
      id: slotId,
      type: slot.type,
      label: slot.label
    });
  });

  // Get the HTML with data-slot attributes added, but original tags preserved
  // H1 stays H1, H2 stays H2, P stays P - exact format of original source template
  const updatedHtmlBody = body.innerHTML;

  return {
    htmlBody: updatedHtmlBody,
    slots: templateSlots
  };
}
