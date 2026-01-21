/**
 * Unified template types that work for both system templates and uploaded templates.
 * This ensures all templates are treated the same way.
 */

export type SlotType = "headline" | "subheadline" | "paragraph" | "list" | "image" | "cta";

export type TemplateSlot = {
  id: string;           // e.g. "page_title", "pageHeadline"
  type: SlotType;       // Type of content slot
  label: string;        // Human-readable label, e.g. "Page title"
};

/**
 * Universal Template Configuration
 * This interface is used by both system templates (like Creatine Report) 
 * and uploaded templates. All templates must conform to this structure.
 */
export type TemplateConfig = {
  id: string;           // Unique template identifier
  name: string;         // Display name
  description?: string; // Optional description
  htmlBody: string;     // HTML structure (innerHTML from <body>)
  css?: string;         // CSS styles
  slots: TemplateSlot[]; // Array of editable content slots
  createdAt?: string;   // ISO date (optional for system templates)
  createdBy?: "system" | "uploaded"; // Origin of template
};

/**
 * Template Metadata (for listing/selection)
 * Lightweight version used in template selection UI
 */
export type TemplateMeta = {
  id: string;
  name: string;
  description: string;
  supportsSidebar?: boolean;
  createdBy: "system" | "uploaded";
};

