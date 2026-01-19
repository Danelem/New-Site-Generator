/**
 * Slot Detection Utility
 * Automatically detects content slots in HTML templates
 * Used during template extraction and editing
 */

import type { TemplateSlot } from "./uploadedTypes";

interface SlotElement {
  element: Element;
  type: TemplateSlot["type"];
  label: string;
  index: number;
}

/**
 * Automatically detect and mark all content slots in HTML
 * Returns the updated HTML with data-slot attributes and the detected slots
 */
export function detectSlots(htmlBody: string): { 
  htmlBody: string; 
  slots: TemplateSlot[] 
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlBody, "text/html");
  const body = doc.body;

  // Remove existing data-slot attributes first
  body.querySelectorAll("[data-slot]").forEach(el => {
    el.removeAttribute("data-slot");
  });

  const textElements: { element: Element; type: string; label: string; index: number }[] = [];
  const processedElements = new Set<Element>();
  
  const isAlreadyProcessed = (el: Element): boolean => {
    if (processedElements.has(el)) return true;
    for (const processed of processedElements) {
      if (processed.contains(el)) return true;
    }
    return false;
  };

  const getTextPreview = (text: string, maxLen: number = 40): string => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return "";
    return trimmed.length > maxLen ? trimmed.substring(0, maxLen) + "..." : trimmed;
  };

  // 1. Find all headings in document order and group content between them
  const allHeadings = Array.from(body.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .filter(h => h.textContent?.trim().length > 0);
  
  for (let i = 0; i < allHeadings.length; i++) {
    const heading = allHeadings[i];
    if (isAlreadyProcessed(heading)) continue;

    const headingText = heading.textContent?.trim() || "";
    const nextHeading = i < allHeadings.length - 1 ? allHeadings[i + 1] : null;
    
    // Collect all content elements between this heading and the next heading
    const sectionElements: Element[] = [];
    let currentEl: Node | null = heading;
    
    // Walk through siblings after the heading
    while (currentEl && currentEl.nextSibling) {
      currentEl = currentEl.nextSibling;
      
      if (currentEl.nodeType !== Node.ELEMENT_NODE) continue;
      
      const el = currentEl as Element;
      
      // Stop if we hit the next heading
      if (nextHeading && (el === nextHeading || el.contains(nextHeading))) {
        break;
      }
      
      // Check if this is a content element
      const tag = el.tagName.toUpperCase();
      const isContentElement = 
        tag === "P" || tag === "UL" || tag === "OL" || 
        tag === "IMG" || tag === "BLOCKQUOTE" || 
        tag === "DIV" || tag === "ARTICLE" || tag === "SECTION";
      
      if (isContentElement && !isAlreadyProcessed(el)) {
        const text = el.textContent?.trim() || "";
        // For paragraphs, require minimum text length
        if (tag === "P" && text.length < 10) continue;
        // Include images and elements with text
        if (tag === "IMG" || text.length > 0) {
          sectionElements.push(el);
          processedElements.add(el);
        }
      }
    }

    // Create container for this section
    let container: Element;
    
    if (sectionElements.length > 0) {
      // Create a wrapper div
      container = doc.createElement("div");
      container.className = "template-section-group";
      
      const parent = heading.parentElement;
      if (parent) {
        // Insert container before the heading
        parent.insertBefore(container, heading);
        
        // Move heading into container
        container.appendChild(heading);
        
        // Move all content elements into container
        sectionElements.forEach(el => {
          container.appendChild(el);
        });
      }
    } else {
      // No content, just use the heading itself
      container = heading;
    }

    processedElements.add(heading);
    
    const tagName = heading.tagName.toLowerCase();
    const level = parseInt(tagName[1]);
    let label = "";
    
    // Use descriptive labeling for headings
    if (level === 1) {
      const h1Idx = textElements.filter(te => te.type === "h1").length;
      label = `H1 Heading ${h1Idx + 1}`;
    } else if (level === 2) {
      const h2Idx = textElements.filter(te => te.type === "h2").length;
      label = `H2 Subheading ${h2Idx + 1}`;
    } else if (level === 3) {
      const h3Idx = textElements.filter(te => te.type === "h3").length;
      label = `H3 Section Header ${h3Idx + 1}`;
    } else if (level === 4) {
      const h4Idx = textElements.filter(te => te.type === "h4").length;
      label = `H4 Subsection ${h4Idx + 1}`;
    } else if (level === 5) {
      const h5Idx = textElements.filter(te => te.type === "h5").length;
      label = `H5 Minor Header ${h5Idx + 1}`;
    } else {
      const h6Idx = textElements.filter(te => te.type === "h6").length;
      label = `H6 Minor Header ${h6Idx + 1}`;
    }
    
    textElements.push({
      element: container,
      type: tagName, // Store the actual tag type (h1, h2, h3, etc.)
      label: label,
      index: textElements.length
    });
  }

  // 2. Find all lists
  const lists = body.querySelectorAll("ul, ol");
  lists.forEach((list) => {
    const text = list.textContent?.trim() || "";
    if (text.length > 0 && !isAlreadyProcessed(list)) {
      const idx = textElements.filter(te => te.type === "list").length;
      textElements.push({
        element: list,
        type: "list",
        label: `${list.tagName.toUpperCase()} List ${idx + 1}`,
        index: idx
      });
      processedElements.add(list);
    }
  });

  // 3. Find all images (img tags)
  const images = body.querySelectorAll("img");
  images.forEach((el) => {
    if (isAlreadyProcessed(el)) return;
    
    const alt = el.getAttribute("alt") || "";
    const src = el.getAttribute("src") || "";
    const idx = textElements.filter(te => te.type === "image").length;
    const label = alt || src || `Image ${idx + 1}`;
    
    textElements.push({
      element: el,
      type: "image",
      label: `Image ${idx + 1}: ${label.length > 40 ? label.substring(0, 40) + "..." : label}`,
      index: idx
    });
    processedElements.add(el);
  });

  // 4. Find all links (a tags)
  const links = body.querySelectorAll("a[href]");
  links.forEach((el) => {
    if (isAlreadyProcessed(el)) return;
    
    const href = el.getAttribute("href") || "";
    const text = el.textContent?.trim() || "";
    if (href && (href.startsWith("http") || href.startsWith("/") || href.startsWith("#"))) {
      const idx = textElements.filter(te => te.type === "url").length;
      textElements.push({
        element: el,
        type: "url",
        label: `Link ${idx + 1}: ${text || href}`,
        index: idx
      });
      processedElements.add(el);
    }
  });

  // 5. Find divs with text content
  const divs = body.querySelectorAll("div");
  divs.forEach((el) => {
    if (isAlreadyProcessed(el)) return;
    
    const text = el.textContent?.trim() || "";
    if (text.length < 20) return;
    
    const childCount = el.children.length;
    const hasDirectText = Array.from(el.childNodes).some(
      node => node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0
    );
    
    let containsProcessed = false;
    for (const processed of processedElements) {
      if (el.contains(processed) && el !== processed) {
        containsProcessed = true;
        break;
      }
    }
    
    if (!containsProcessed && (
      (text.length >= 30 && (hasDirectText || childCount <= 8)) ||
      text.length >= 100
    )) {
      const idx = textElements.filter(te => te.type === "div").length;
      textElements.push({
        element: el,
        type: "div",
        label: `Content Block ${idx + 1}: ${getTextPreview(text, 50)}`,
        index: idx
      });
      processedElements.add(el);
    }
  });

  // Add data-slot attributes and create template slots
  const slots: TemplateSlot[] = [];
  textElements.forEach((item) => {
    const slotId = `section_${item.type}_${item.index}`;
    item.element.setAttribute("data-slot", slotId);
    
    let slotType: TemplateSlot["type"] = "text";
    if (item.type === "ul" || item.type === "ol" || item.type === "list") {
      slotType = "list";
    } else if (item.type === "image" || item.element.tagName === "IMG") {
      slotType = "image";
    } else if (item.type === "url" || item.element.tagName === "A") {
      slotType = "url";
    } else if (item.type === "section") {
      // Section containers are text type (can contain paragraphs, lists, etc.)
      slotType = "text";
    }

    slots.push({
      id: slotId,
      type: slotType,
      label: item.label
    });
  });

  // Return updated HTML and slots
  return {
    htmlBody: body.innerHTML,
    slots
  };
}
