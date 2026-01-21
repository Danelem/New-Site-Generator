/**
 * Template Field Definitions
 * Defines the content slots available in each template.
 * Used for mapping core narrative to specific slots.
 * 
 * This module provides a unified interface for all templates,
 * whether they are system templates (like Creatine Report) or uploaded templates.
 */

import type { TemplateFieldDefinition } from './types';
import type { TemplateConfig } from '@/lib/templates/types';

/**
 * Get template field definitions for ANY template.
 * This is the single function used for all templates (system and uploaded).
 * 
 * @param template - The template configuration object (TemplateConfig)
 * @returns Array of field definitions for AI generation
 */
export function getTemplateFields(template: TemplateConfig): TemplateFieldDefinition[] {
  // Validate template and slots
  if (!template || !template.slots) {
    console.warn('⚠️ Template or slots is missing:', { template: !!template, slots: !!template?.slots });
    return [];
  }
  
  // Filter out any undefined/null slots and image slots (they don't need narrative content)
  // Only include slots that need text content (headline, subheadline, paragraph, list, cta)
  return template.slots
    .filter((slot): slot is NonNullable<typeof slot> => 
      slot != null && 
      slot.id != null && 
      slot.type !== 'image' // Images don't need narrative mapping
    )
    .map(slot => {
      const slotType = mapSlotType(slot.type || 'paragraph');
    
    // Assign default maxLength and instructions based on slot type
    let maxLength: number | undefined;
    let defaultInstructions: string | undefined;
    
    if (slotType === 'headline') {
      maxLength = 80; // Headlines: 80 chars max
      defaultInstructions = "Write a punchy, attention-grabbing hook. No periods at the end.";
    } else if (slotType === 'subheadline') {
      maxLength = 100; // Subheadlines: 100 chars max
      defaultInstructions = "Write a short, descriptive subhead. 3-8 words.";
    } else if (slotType === 'cta') {
      maxLength = 30; // CTAs: 30 chars max
      defaultInstructions = "Write a button label (e.g., 'Check Price', 'Read Review').";
    } else if (slotType === 'paragraph') {
      maxLength = 800; // Paragraphs: 800 chars max
      defaultInstructions = "Write a full paragraph.";
    } else if (slotType === 'list') {
      maxLength = 800; // Lists: 800 chars max
      // Lists don't need default instructions, they have their own format
    }
    
    // Special handling for Creatine Report template slots (for backward compatibility)
    // These provide more specific instructions
    const specialInstructions: Record<string, { description?: string; instructions?: string; maxLength?: number }> = {
      'pageHeadline': {
        description: 'Main page headline that captures the hook',
        maxLength: 80,
        instructions: 'Should naturally incorporate the main keyword',
      },
      'introParagraph': {
        description: 'Introduction paragraph that addresses the main keyword/topic',
        maxLength: 500,
        instructions: '3-5 sentences introducing the product and topic',
      },
      'mainBenefits': {
        description: 'List of key benefits (one per line)',
        maxLength: 800,
        instructions: '5-8 key benefits, each as a complete sentence or phrase',
      },
      'effectivenessParagraphs': {
        description: 'Paragraphs explaining product effectiveness',
        maxLength: 1500,
        instructions: 'Multiple paragraphs (one per line) about how the product works',
      },
      'comparisonParagraphs': {
        description: 'Paragraphs comparing the product to alternatives',
        maxLength: 1500,
        instructions: 'Multiple paragraphs (one per line) comparing to competitors',
      },
      'reviewParagraphs': {
        description: 'Customer review and testimonial paragraphs',
        maxLength: 1500,
        instructions: 'Multiple paragraphs (one per line) with customer feedback',
      },
      'bottomLineParagraph': {
        description: 'Concluding paragraph summarizing the value proposition',
        maxLength: 500,
        instructions: 'Strong conclusion that reinforces the main message',
      },
      'sidebarDiscoverItems': {
        description: 'Items for "Discover" section in sidebar',
        maxLength: 400,
        instructions: 'List of topics (one per line) related to the product',
      },
      'sidebarTopItems': {
        description: 'Top items to consider in sidebar',
        maxLength: 400,
        instructions: 'List of considerations (one per line) when choosing the product',
      },
      'newsletterTitle': {
        description: 'Title for newsletter signup section',
        maxLength: 60,
      },
      'newsletterDesc': {
        description: 'Description for newsletter signup section',
        maxLength: 200,
      },
    };
    
    const special = specialInstructions[slot.id];
    
    return {
      slotId: slot.id,
      label: slot.label,
      slotType,
      description: special?.description || `Content slot: ${slot.label}`,
      maxLength: special?.maxLength || maxLength,
      instructions: special?.instructions || defaultInstructions,
    };
  });
}

/**
 * Map template slot type to our SlotType for AI generation.
 * Only maps exact types - no generic fallback to 'paragraph'.
 */
function mapSlotType(slotType: string): TemplateFieldDefinition['slotType'] {
  const typeMap: Record<string, TemplateFieldDefinition['slotType']> = {
    // New granular types - exact mapping
    headline: 'headline',
    subheadline: 'subheadline',
    paragraph: 'paragraph',
    list: 'list',
    cta: 'cta',
    image: 'paragraph', // Images are filtered out, but map for safety if needed
    // Legacy types (for backward compatibility)
    text: 'paragraph',
    'rich-text': 'paragraph',
    url: 'cta', // Legacy 'url' maps to 'cta' for generation
  };
  
  // Only return mapped type if it exists, otherwise default to paragraph
  // This ensures we always have a valid type
  return typeMap[slotType] || 'paragraph';
}

/**
 * @deprecated Use getTemplateFields instead.
 * Kept for backward compatibility during migration.
 */
export function getCreatineReportFields(): TemplateFieldDefinition[] {
  // This will be removed after migration
  // For now, return empty array - callers should use getTemplateFields
  return [];
}

/**
 * @deprecated Use getTemplateFields instead.
 * Kept for backward compatibility during migration.
 */
export function getUploadedTemplateFields(
  slots: Array<{ id: string; label: string; type: string }>
): TemplateFieldDefinition[] {
  // Convert to TemplateConfig format and use unified function
  const mockTemplate: TemplateConfig = {
    id: 'temp',
    name: 'Temp',
    htmlBody: '',
    slots: slots.map(s => ({ id: s.id, type: s.type as any, label: s.label })),
  };
  return getTemplateFields(mockTemplate);
}
