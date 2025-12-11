/**
 * Core types for the content generation system.
 * Implements a "Source-of-Truth" architecture where a master narrative
 * is generated first, then all slot content is derived from it.
 */

/**
 * User configuration input for content generation.
 * Contains all the parameters needed to generate consistent, targeted content.
 */
export interface UserConfig {
  productName: string;
  mainKeyword: string;
  ageRange: string;
  gender: string;
  country?: string;
  state?: string; // Legacy: single state (deprecated, use targetStates)
  targetStates?: string[]; // Array of US states for regional targeting
  tone: string;
  productUrl?: string;
  websiteUrl?: string;
  // Optional: Additional context that might influence generation
  painPoints?: string[];
  targetAudience?: string;
}

/**
 * Core Content Context - The "Source of Truth"
 * This is the master narrative generated in Step 1 that serves as the
 * foundation for all subsequent slot content generation.
 */
export interface CoreContentContext {
  /** The complete master narrative/article text */
  coreNarrative: string;
  /** Timestamp when the core content was generated */
  generatedAt: string;
  /** The user config that was used to generate this core content */
  sourceConfig: UserConfig;
}

/**
 * Request for generating a specific content slot.
 * The slot content will be derived from the core narrative.
 */
export interface SlotGenerationRequest {
  /** The slot identifier (e.g., 'hero_headline', 'feature_bullet_1') */
  slotId: string;
  /** The type/purpose of the slot (e.g., 'headline', 'paragraph', 'bullet') */
  slotType: SlotType;
  /** The core narrative to derive content from */
  coreNarrative: string;
  /** User config for additional context */
  userConfig: UserConfig;
  /** Optional: Specific instructions for this slot */
  slotInstructions?: string;
  /** Optional: Maximum length constraint */
  maxLength?: number;
}

/**
 * Types of content slots that can be generated.
 */
export type SlotType = 
  | 'headline'
  | 'subheadline'
  | 'paragraph'
  | 'bullet'
  | 'list'
  | 'cta'
  | 'meta-description'
  | 'quote';

/**
 * Response from slot generation.
 */
export interface SlotGenerationResponse {
  /** The generated content for the slot */
  content: string;
  /** The slot ID this content is for */
  slotId: string;
  /** Whether the generation was successful */
  success: boolean;
  /** Error message if generation failed */
  error?: string;
}

/**
 * Request for generating core narrative (Step 1).
 */
export interface CoreNarrativeRequest {
  userConfig: UserConfig;
  /** Optional: Additional instructions for the core narrative */
  narrativeInstructions?: string;
}

/**
 * Response from core narrative generation.
 */
export interface CoreNarrativeResponse {
  /** The generated core narrative */
  coreNarrative: string;
  /** Whether the generation was successful */
  success: boolean;
  /** Error message if generation failed */
  error?: string;
}

/**
 * Complete generation request that includes core content.
 * Used when generating multiple slots in a batch.
 */
export interface BatchGenerationRequest {
  /** The core content context (must be generated first) */
  coreContent: CoreContentContext;
  /** List of slots to generate */
  slots: Array<{
    slotId: string;
    slotType: SlotType;
    slotInstructions?: string;
    maxLength?: number;
  }>;
  /** User config for additional context */
  userConfig: UserConfig;
}

/**
 * Response from batch generation.
 */
export interface BatchGenerationResponse {
  /** Map of slotId -> generated content */
  slots: Record<string, string>;
  /** Whether all generations were successful */
  success: boolean;
  /** Errors for any failed slots */
  errors?: Record<string, string>;
}

/**
 * AI Model configuration for content generation.
 * Allows easy swapping of AI providers/models.
 */
export interface AIModelConfig {
  /** Model identifier (e.g., 'gemini-2.0-flash') */
  modelName: string;
  /** API key for the AI service */
  apiKey: string;
  /** Temperature setting (0-1) for creativity vs consistency */
  temperature?: number;
  /** Maximum tokens for generation */
  maxTokens?: number;
}

/**
 * Template Field Definition
 * Describes a content slot in a template that needs to be filled.
 */
export interface TemplateFieldDefinition {
  /** Unique identifier for the slot (e.g., 'page_headline', 'intro_paragraph') */
  slotId: string;
  /** Human-readable label for the slot */
  label: string;
  /** Type of content expected in this slot */
  slotType: SlotType;
  /** Optional: Specific instructions for this slot */
  instructions?: string;
  /** Optional: Maximum length constraint */
  maxLength?: number;
  /** Optional: Description of what content should go in this slot */
  description?: string;
}

/**
 * Request for mapping core narrative to template slots.
 * Takes the core narrative and distributes it across all defined slots.
 */
export interface MapNarrativeToSlotsRequest {
  /** The core narrative to distribute */
  coreNarrative: string;
  /** List of template field definitions to map content to */
  templateFields: TemplateFieldDefinition[];
  /** User config for additional context */
  userConfig: UserConfig;
}

/**
 * Response from mapping narrative to slots.
 * Contains the distributed content for each slot.
 */
export interface MapNarrativeToSlotsResponse {
  /** Map of slotId -> generated content */
  slots: Record<string, string>;
  /** Whether the mapping was successful */
  success: boolean;
  /** Error message if mapping failed */
  error?: string;
  /** Errors for individual slots that failed */
  slotErrors?: Record<string, string>;
}

/**
 * Request for regenerating a single slot with core narrative context.
 */
export interface RegenerateSlotRequest {
  /** The slot to regenerate */
  slotId: string;
  /** The slot type */
  slotType: SlotType;
  /** The core narrative to use as context */
  coreNarrative: string;
  /** User config for tone and audience context */
  userConfig: UserConfig;
  /** Optional: Specific instructions for regeneration */
  regenerationInstructions?: string;
  /** Optional: Maximum length constraint */
  maxLength?: number;
}

/**
 * Response from slot regeneration.
 */
export interface RegenerateSlotResponse {
  /** The regenerated content */
  content: string;
  /** Whether regeneration was successful */
  success: boolean;
  /** Error message if regeneration failed */
  error?: string;
}
