/**
 * Slot Detection Utility - FIXED & ROBUST
 * Automatically detects editable content slots and assigns granular types.
 */

import type { TemplateSlot, SlotType } from './types';

export interface DetectSlotsResult {
  htmlBody: string;
  slots: TemplateSlot[];
}

/**
 * Detects editable content slots in HTML and adds data-slot attributes.
 */
export function detectSlots(htmlBody: string): DetectSlotsResult {
  if (!htmlBody || typeof htmlBody !== 'string') {
    return { htmlBody: htmlBody || '', slots: [] };
  }

  // Use DOMParser if available (browser)
  let doc: Document;
  let serializer: XMLSerializer | null = null;

  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(htmlBody, 'text/html');
    if (typeof XMLSerializer !== 'undefined') {
      serializer = new XMLSerializer();
    }
  } catch (error) {
    // Fallback to regex if DOMParser fails (Node.js/Server)
    return detectSlotsRegex(htmlBody);
  }

  const body = doc.body || doc.documentElement;
  if (!body) {
    return { htmlBody, slots: [] };
  }

  const slots: TemplateSlot[] = [];
  let slotCounter = 0;

  /**
   * Helper: Check if element is inside an ignored structural element
   * Returns true if the element or any parent matches ignored tags/classes/IDs
   */
  function isInsideIgnoredElement(element: Element): boolean {
    const ignoredTags = ['nav', 'footer', 'header', 'script', 'style', 'svg'];
    const ignoredPatterns = ['menu', 'nav', 'footer', 'popup', 'hidden', 'sidebar', 'cookie'];
    
    let current: Element | null = element;
    
    while (current && current !== body) {
      // Check tag name
      const tagName = current.tagName.toLowerCase();
      if (ignoredTags.includes(tagName)) {
        return true;
      }
      
      // Check classes and IDs
      const classAttr = current.getAttribute('class') || '';
      const idAttr = current.getAttribute('id') || '';
      const combined = `${classAttr} ${idAttr}`.toLowerCase();
      
      if (ignoredPatterns.some(pattern => combined.includes(pattern))) {
        return true;
      }
      
      // Move up to parent
      current = current.parentElement;
    }
    
    return false;
  }

  /**
   * Helper: Determine the specific SlotType based on the HTML tag
   */
  function getSlotType(tagName: string, element: Element): SlotType | null {
    const tag = tagName.toLowerCase();
    
    if (tag === 'h1' || tag === 'h2') return 'headline';
    if (['h3', 'h4', 'h5', 'h6'].includes(tag)) return 'subheadline';
    if (tag === 'p') return 'paragraph';
    if (tag === 'ul' || tag === 'ol') return 'list';
    if (tag === 'img') return 'image';
    
    // For links, only treat them as slots if they look like buttons/CTAs or nav items
    // (ignoring empty links or anchors)
    if (tag === 'a') {
      const href = element.getAttribute('href');
      const text = element.textContent?.trim();
      if (href && text && text.length > 0) {
        return 'cta';
      }
    }
    
    return null;
  }

  /**
   * Process all relevant elements in the DOM
   */
  const allElements = body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, img, a');
  
  allElements.forEach((element) => {
    // 0. Skip if inside ignored structural elements (nav, footer, header, etc.)
    if (isInsideIgnoredElement(element)) return;
    
    // 1. Determine Type
    const type = getSlotType(element.tagName, element);
    if (!type) return;

    // 2. Skip if already processed
    if (element.hasAttribute('data-slot')) return;
    
    // Skip tiny text (unless it's a heading or image)
    const text = element.textContent?.trim() || '';
    if (type === 'paragraph' && text.length < 10) return; 
    if (type === 'cta' && text.length < 2) return;

    // 3. Generate ID
    const slotId = generateSlotId(element, type, text, slots);
    const label = generateLabel(slotId);

    // 4. Mark the DOM
    element.setAttribute('data-slot', slotId);

    // 5. Register Slot
    slots.push({
      id: slotId,
      type,
      label,
    });
    slotCounter++;
  });

  // Serialize back to HTML string
  let updatedHtmlBody: string;
  if (serializer) {
    updatedHtmlBody = serializer.serializeToString(body);
    // Remove the <body> tags wrapper
    updatedHtmlBody = updatedHtmlBody.replace(/^<body[^>]*>|<\/body>$/gi, '');
  } else {
    const bodyElement = body as HTMLElement;
    if ('innerHTML' in bodyElement && bodyElement.innerHTML) {
      updatedHtmlBody = bodyElement.innerHTML || htmlBody;
    } else if ('children' in bodyElement && bodyElement.children) {
      // Fallback: reconstruct from elements
      updatedHtmlBody = Array.from(bodyElement.children)
        .map((child) => (child as HTMLElement).outerHTML || '')
        .join('\n');
    } else {
      updatedHtmlBody = htmlBody;
    }
  }

  return {
    htmlBody: updatedHtmlBody,
    slots,
  };
}

/**
 * Generate a unique, readable ID
 */
function generateSlotId(element: Element, type: SlotType, text: string, existingSlots: TemplateSlot[]): string {
  // Try to make a semantic ID from content (e.g., "how_to_find_quality")
  let baseId = '';
  
  if (text) {
    baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') // trim underscores
      .substring(0, 35); // keep it reasonable length
  } else if (type === 'image') {
    const alt = element.getAttribute('alt');
    if (alt) {
      baseId = alt.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 35);
    }
  }

  // Fallback if no text content (e.g. image with no alt)
  if (!baseId || baseId.length < 3) {
    baseId = `${type}_${existingSlots.length}`;
  }

  // Ensure uniqueness
  let slotId = baseId;
  let counter = 1;
  while (existingSlots.some(s => s.id === slotId)) {
    slotId = `${baseId}_${counter}`;
    counter++;
  }

  return slotId;
}

function generateLabel(slotId: string): string {
  return slotId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Fallback regex-based detection (for Node.js environment without DOM)
 */
function detectSlotsRegex(htmlBody: string): DetectSlotsResult {
  const slots: TemplateSlot[] = [];
  let updatedHtml = htmlBody;
  
  // Regex patterns for our granular types
  const patterns = [
    { tag: 'h[1-2]', type: 'headline' as SlotType },
    { tag: 'h[3-6]', type: 'subheadline' as SlotType },
    { tag: 'p', type: 'paragraph' as SlotType },
    { tag: '(?:ul|ol)', type: 'list' as SlotType },
    { tag: 'a', type: 'cta' as SlotType },
    { tag: 'img', type: 'image' as SlotType },
  ];

  patterns.forEach(({ tag, type }) => {
    // Match opening tag + content + closing tag (simplified)
    // Note: This regex is basic and relies on standard HTML formatting
    const regex = new RegExp(`<(${tag})([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'gi');
    
    updatedHtml = updatedHtml.replace(regex, (match, tagName, attrs, content) => {
      // Skip if already has slot
      if (attrs.includes('data-slot')) return match;

      // Basic noise filter for regex
      const textContent = content.replace(/<[^>]*>/g, '').trim();
      if (type === 'paragraph' && textContent.length < 10) return match;
      if (type === 'cta' && textContent.length < 2) return match;

      // Generate ID
      const baseId = textContent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 35) || `${type}_${slots.length}`;

      let slotId = baseId;
      let counter = 1;
      while (slots.some(s => s.id === slotId)) {
        slotId = `${baseId}_${counter}`;
        counter++;
      }

      const label = generateLabel(slotId);
      slots.push({ id: slotId, type, label });

      // Add data-slot attribute
      return `<${tagName}${attrs} data-slot="${slotId}">${content}</${tagName}>`;
    });
    
    // Handle self-closing images separately
    if (tag === 'img') {
       updatedHtml = updatedHtml.replace(/<img([^>]*)>/gi, (match, attrs) => {
        if (attrs.includes('data-slot')) return match;
        const slotId = `image_${slots.length}`;
        const label = generateLabel(slotId);
        slots.push({ id: slotId, type: 'image', label });
        return `<img${attrs} data-slot="${slotId}">`;
      });
    }
  });

  return { htmlBody: updatedHtml, slots };
}
