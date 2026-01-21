/**
 * Slot Detection Utility
 * Automatically detects editable content slots in HTML templates
 * by finding headings, paragraphs, lists, images, and links.
 */

import type { TemplateSlot, SlotType } from './types';

export interface DetectSlotsResult {
  htmlBody: string;
  slots: TemplateSlot[];
}

/**
 * Detects editable content slots in HTML and adds data-slot attributes.
 * Works in both browser and Node.js environments.
 */
export function detectSlots(htmlBody: string): DetectSlotsResult {
  if (!htmlBody || typeof htmlBody !== 'string') {
    return { htmlBody: htmlBody || '', slots: [] };
  }

  // Use DOMParser if available (browser or Node.js with jsdom)
  let doc: Document;
  let serializer: XMLSerializer | null = null;

  try {
    // Try browser/Node.js DOMParser
    const parser = new DOMParser();
    doc = parser.parseFromString(htmlBody, 'text/html');
    
    // Check if XMLSerializer is available (for browser)
    if (typeof XMLSerializer !== 'undefined') {
      serializer = new XMLSerializer();
    }
  } catch (error) {
    // Fallback: use regex-based approach if DOMParser fails
    console.warn('DOMParser not available, using regex fallback:', error);
    return detectSlotsRegex(htmlBody);
  }

  const body = doc.body || doc.documentElement;
  if (!body) {
    return { htmlBody, slots: [] };
  }

  const slots: TemplateSlot[] = [];
  let slotCounter = 0;

  /**
   * Generate a unique slot ID from element content and type
   */
  function generateSlotId(element: Element, type: SlotType): string {
    // Try to get meaningful text from the element
    let text = '';
    
    if (element.textContent) {
      text = element.textContent.trim().substring(0, 50);
    } else if (element.getAttribute('alt')) {
      text = element.getAttribute('alt') || '';
    } else if (element.getAttribute('title')) {
      text = element.getAttribute('title') || '';
    } else if (element.getAttribute('href')) {
      text = element.getAttribute('href') || '';
    }

    // Convert text to a valid ID
    let baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 40);

    // If no meaningful text, use element type and position
    if (!baseId) {
      const tagName = element.tagName.toLowerCase();
      baseId = `${tagName}_${slotCounter}`;
    }

    // Ensure uniqueness
    let slotId = baseId;
    let counter = 1;
    while (slots.some(s => s.id === slotId)) {
      slotId = `${baseId}_${counter}`;
      counter++;
    }

    return slotId;
  }

  /**
   * Generate a human-readable label from slot ID
   */
  function generateLabel(slotId: string, type: SlotType): string {
    return slotId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Process an element and add data-slot if it's a content element
   */
  function processElement(element: Element, type: SlotType): boolean {
    // Skip if already has a data-slot attribute
    if (element.hasAttribute('data-slot')) {
      return false;
    }

    // Skip script, style, and other non-content elements
    const tagName = element.tagName.toLowerCase();
    if (['script', 'style', 'meta', 'link', 'noscript'].includes(tagName)) {
      return false;
    }

    // Skip empty elements (unless they're images or links)
    if (type !== 'image' && type !== 'url' && !element.textContent?.trim()) {
      return false;
    }

    const slotId = generateSlotId(element, type);
    const label = generateLabel(slotId, type);

    // Add data-slot attribute
    element.setAttribute('data-slot', slotId);

    // Add to slots array
    slots.push({
      id: slotId,
      type,
      label,
    });

    slotCounter++;
    return true;
  }

  // Detect headings (H1-H6)
  const headings = body.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading) => {
    processElement(heading, 'text');
  });

  // Detect paragraphs
  const paragraphs = body.querySelectorAll('p');
  paragraphs.forEach((p) => {
    processElement(p, 'text');
  });

  // Detect lists (UL, OL)
  const lists = body.querySelectorAll('ul, ol');
  lists.forEach((list) => {
    processElement(list, 'list');
  });

  // Detect images
  const images = body.querySelectorAll('img');
  images.forEach((img) => {
    processElement(img, 'image');
  });

  // Detect links (A tags)
  const links = body.querySelectorAll('a[href]');
  links.forEach((link) => {
    // Only process if it has meaningful content or href
    if (link.textContent?.trim() || link.getAttribute('href')) {
      processElement(link, 'url');
    }
  });

  // Serialize back to HTML string
  let updatedHtmlBody: string;
  
  if (serializer) {
    // Browser: use XMLSerializer
    updatedHtmlBody = serializer.serializeToString(body);
    // Remove the <body> tags that XMLSerializer adds
    updatedHtmlBody = updatedHtmlBody.replace(/^<body[^>]*>|<\/body>$/gi, '');
  } else {
    // Node.js: use innerHTML or outerHTML
    const bodyElement = body as HTMLElement;
    if ('innerHTML' in bodyElement && bodyElement.innerHTML) {
      updatedHtmlBody = bodyElement.innerHTML || htmlBody;
    } else if ('children' in bodyElement && bodyElement.children) {
      // Fallback: reconstruct from elements
      updatedHtmlBody = Array.from(bodyElement.children)
        .map((child) => (child as HTMLElement).outerHTML || '')
        .join('\n');
    } else {
      // Ultimate fallback
      updatedHtmlBody = htmlBody;
    }
  }

  return {
    htmlBody: updatedHtmlBody || htmlBody,
    slots,
  };
}

/**
 * Fallback regex-based slot detection (used when DOMParser is unavailable)
 */
function detectSlotsRegex(htmlBody: string): DetectSlotsResult {
  const slots: TemplateSlot[] = [];
  let slotCounter = 0;
  let updatedHtml = htmlBody;

  // Patterns for different element types
  const patterns = [
    {
      regex: /<(h[1-6])[^>]*>(.*?)<\/\1>/gi,
      type: 'text' as SlotType,
      tagName: 'h',
    },
    {
      regex: /<(p)[^>]*>(.*?)<\/\1>/gi,
      type: 'text' as SlotType,
      tagName: 'p',
    },
    {
      regex: /<(ul|ol)[^>]*>[\s\S]*?<\/\1>/gi,
      type: 'list' as SlotType,
      tagName: 'list',
    },
    {
      regex: /<(img)[^>]*>/gi,
      type: 'image' as SlotType,
      tagName: 'img',
    },
    {
      regex: /<(a)[^>]*href=["']([^"']+)["'][^>]*>.*?<\/\1>/gi,
      type: 'url' as SlotType,
      tagName: 'a',
    },
  ];

  patterns.forEach((pattern) => {
    let match;
    const matches: Array<{ index: number; content: string; type: SlotType }> = [];

    // Collect all matches first
    while ((match = pattern.regex.exec(htmlBody)) !== null) {
      matches.push({
        index: match.index,
        content: match[0],
        type: pattern.type,
      });
    }

    // Process matches in reverse order to preserve indices
    matches.reverse().forEach((match) => {
      // Extract text for ID generation
      const textMatch = match.content.match(/>([^<]+)</);
      const text = textMatch ? textMatch[1].trim().substring(0, 50) : '';

      let baseId = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 40);

      if (!baseId) {
        baseId = `${pattern.tagName}_${slotCounter}`;
      }

      let slotId = baseId;
      let counter = 1;
      while (slots.some((s) => s.id === slotId)) {
        slotId = `${baseId}_${counter}`;
        counter++;
      }

      const label = slotId
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      slots.push({
        id: slotId,
        type: match.type,
        label,
      });

      // Add data-slot attribute to the HTML
      const slotAttr = ` data-slot="${slotId}"`;
      // Find the opening tag and add the attribute
      updatedHtml = updatedHtml.replace(
        match.content,
        match.content.replace(/(<[^>]+)(>)/, `$1${slotAttr}$2`)
      );

      slotCounter++;
    });
  });

  return {
    htmlBody: updatedHtml,
    slots,
  };
}
