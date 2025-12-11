/**
 * Template Field Definitions
 * Defines the content slots available in each template.
 * Used for mapping core narrative to specific slots.
 */

import type { TemplateFieldDefinition } from './types';

/**
 * Get template field definitions for the CreatineReport template.
 * These define all the editable content slots in the template.
 */
export function getCreatineReportFields(): TemplateFieldDefinition[] {
  return [
    {
      slotId: 'pageHeadline',
      label: 'Page Headline',
      slotType: 'headline',
      description: 'Main page headline that captures the hook',
      maxLength: 80,
      instructions: 'Should naturally incorporate the main keyword',
    },
    {
      slotId: 'introParagraph',
      label: 'Intro Paragraph',
      slotType: 'paragraph',
      description: 'Introduction paragraph that addresses the main keyword/topic',
      instructions: '3-5 sentences introducing the product and topic',
    },
    {
      slotId: 'mainBenefits',
      label: 'Main Benefits',
      slotType: 'list',
      description: 'List of key benefits (one per line)',
      instructions: '5-8 key benefits, each as a complete sentence or phrase',
    },
    {
      slotId: 'effectivenessParagraphs',
      label: 'Effectiveness Paragraphs',
      slotType: 'paragraph',
      description: 'Paragraphs explaining product effectiveness',
      instructions: 'Multiple paragraphs (one per line) about how the product works',
    },
    {
      slotId: 'comparisonParagraphs',
      label: 'Comparison Paragraphs',
      slotType: 'paragraph',
      description: 'Paragraphs comparing the product to alternatives',
      instructions: 'Multiple paragraphs (one per line) comparing to competitors',
    },
    {
      slotId: 'reviewParagraphs',
      label: 'Review Paragraphs',
      slotType: 'paragraph',
      description: 'Customer review and testimonial paragraphs',
      instructions: 'Multiple paragraphs (one per line) with customer feedback',
    },
    {
      slotId: 'bottomLineParagraph',
      label: 'Bottom Line Paragraph',
      slotType: 'paragraph',
      description: 'Concluding paragraph summarizing the value proposition',
      instructions: 'Strong conclusion that reinforces the main message',
    },
    {
      slotId: 'sidebarDiscoverItems',
      label: 'Sidebar Discover Items',
      slotType: 'list',
      description: 'Items for "Discover" section in sidebar',
      instructions: 'List of topics (one per line) related to the product',
    },
    {
      slotId: 'sidebarTopItems',
      label: 'Sidebar Top Items',
      slotType: 'list',
      description: 'Top items to consider in sidebar',
      instructions: 'List of considerations (one per line) when choosing the product',
    },
    {
      slotId: 'newsletterTitle',
      label: 'Newsletter Title',
      slotType: 'headline',
      description: 'Title for newsletter signup section',
      maxLength: 60,
    },
    {
      slotId: 'newsletterDesc',
      label: 'Newsletter Description',
      slotType: 'paragraph',
      description: 'Description for newsletter signup section',
      maxLength: 200,
    },
  ];
}

/**
 * Get template field definitions for an uploaded template.
 * Uses the template's slot definitions.
 */
export function getUploadedTemplateFields(
  slots: Array<{ id: string; label: string; type: string }>
): TemplateFieldDefinition[] {
  return slots.map(slot => ({
    slotId: slot.id,
    label: slot.label,
    slotType: mapSlotType(slot.type),
    description: `Content slot: ${slot.label}`,
  }));
}

/**
 * Map uploaded template slot type to our SlotType.
 */
function mapSlotType(uploadedType: string): TemplateFieldDefinition['slotType'] {
  const typeMap: Record<string, TemplateFieldDefinition['slotType']> = {
    text: 'paragraph',
    list: 'list',
    image: 'paragraph', // Images don't need text generation
    url: 'paragraph', // URLs don't need text generation
  };
  
  return typeMap[uploadedType] || 'paragraph';
}
