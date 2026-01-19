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
  
  // Filter out any undefined/null slots, image slots, and url slots (they don't need narrative content)
  // Only include slots that need text content (text, list, rich-text)
  return template.slots
    .filter((slot): slot is NonNullable<typeof slot> => 
      slot != null && 
      slot.id != null && 
      slot.type !== 'image' && 
      slot.type !== 'url' // Images and URLs don't need narrative mapping
    )
    .map(slot => {
      const slotType = mapSlotType(slot.type || 'text');
    
    // Assign default maxLength based on slot type
    let maxLength: number | undefined;
    if (slotType === 'headline') {
      maxLength = 100; // Headlines: 100 chars
    } else if (slotType === 'list') {
      maxLength = 800; // Lists: 800 chars
    } else if (slotType === 'paragraph') {
      maxLength = 1000; // Paragraphs: 1000 chars
    }
    // No limit for other types
    
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
      instructions: special?.instructions,
    };
  });
}

/**
 * Map template slot type to our SlotType for AI generation.
 */
function mapSlotType(slotType: string): TemplateFieldDefinition['slotType'] {
  const typeMap: Record<string, TemplateFieldDefinition['slotType']> = {
    text: 'paragraph',
    'rich-text': 'paragraph',
    list: 'list',
    image: 'paragraph', // Images don't need text generation
    url: 'paragraph', // URLs don't need text generation
  };
  
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
