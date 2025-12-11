/**
 * Content Generator Service
 * Implements a two-step "Source-of-Truth" generation pipeline:
 * 1. Generate Core Narrative (master article)
 * 2. Derive all slot content from the core narrative
 */

import type {
  UserConfig,
  CoreContentContext,
  CoreNarrativeRequest,
  CoreNarrativeResponse,
  SlotGenerationRequest,
  SlotGenerationResponse,
  AIModelConfig,
  MapNarrativeToSlotsRequest,
  MapNarrativeToSlotsResponse,
  RegenerateSlotRequest,
  RegenerateSlotResponse,
  TemplateFieldDefinition,
  SlotType,
} from './types';
import { 
  buildCoreNarrativePrompt, 
  buildSlotGenerationPrompt,
  buildMapNarrativeToSlotsPrompt,
  buildRegenerateSlotPrompt,
  extractJsonFromResponse,
} from './prompts';

/**
 * AI Model Provider Interface
 * Allows easy swapping of AI providers (Google Gemini, OpenAI, etc.)
 */
export interface AIModelProvider {
  generateText(prompt: string, config: AIModelConfig): Promise<string>;
}

/**
 * Helper function to sleep/delay execution
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Google Gemini implementation of AIModelProvider
 */
export class GoogleGeminiProvider implements AIModelProvider {
  async generateText(prompt: string, config: AIModelConfig): Promise<string> {
    // Dynamic import to avoid issues if package is not installed
    const googleAIModule = await Function('return import("@google/generative-ai")')();
    const GoogleGenerativeAI = googleAIModule.GoogleGenerativeAI;
    
    if (!GoogleGenerativeAI) {
      throw new Error('GoogleGenerativeAI class not found in module');
    }

    const genAI = new GoogleGenerativeAI(config.apiKey);
    
    // Try multiple model names with fallback
    const modelNames = [
      config.modelName,
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
    ];

    let lastError: any = null;
    
    for (const modelName of modelNames) {
      // Retry logic with exponential backoff for rate limits
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount <= maxRetries) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            temperature: config.temperature ?? 0.7,
          });
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          console.log(`✅ Successfully generated content using model: ${modelName}`);
          return text;
        } catch (error: any) {
          lastError = error;
          
          // If it's a 404/model not found error, try the next model
          if (error.message?.includes('404') || 
              error.message?.includes('not found') ||
              error.message?.includes('is not found')) {
            console.log(`⚠️ Model ${modelName} not available, trying next...`);
            break; // Break out of retry loop, try next model
          } 
          // If it's a rate limit error, retry with exponential backoff
          else if (error.message?.includes('429') || 
                   error.message?.includes('Too Many Requests') ||
                   error.message?.includes('rate limit')) {
            if (retryCount < maxRetries) {
              const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
              console.log(`⚠️ Rate limit hit (429). Retrying in ${backoffDelay / 1000}s... (attempt ${retryCount + 1}/${maxRetries})`);
              await sleep(backoffDelay);
              retryCount++;
              continue; // Retry the same model
            } else {
              // Max retries reached, throw error
              throw new Error(
                'API rate limit exceeded (429 Too Many Requests). ' +
                'Maximum retries reached. Please wait a few minutes before trying again. ' +
                'If this persists, check your Google AI API quota and usage limits.'
              );
            }
          } 
          // For other errors (auth, etc), throw immediately
          else {
            throw error;
          }
        }
      }
    }
    
    // If all models failed
    throw new Error(
      `No available Gemini models found. Tried: ${modelNames.join(', ')}. ` +
      `Last error: ${lastError?.message || 'All models returned 404 Not Found'}`
    );
  }
}

/**
 * Content Generator Service
 * Main service class for generating content using the two-step pipeline.
 */
export class ContentGenerator {
  private aiProvider: AIModelProvider;
  private modelConfig: AIModelConfig;

  constructor(aiProvider?: AIModelProvider, modelConfig?: Partial<AIModelConfig>) {
    // Default to Google Gemini if no provider specified
    this.aiProvider = aiProvider ?? new GoogleGeminiProvider();
    
    // Get API key from environment
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }

    // Default model configuration
    this.modelConfig = {
      modelName: 'gemini-2.0-flash',
      apiKey,
      temperature: 0.7,
      maxTokens: 4000,
      ...modelConfig,
    };
  }

  /**
   * Step 1: Generate Core Narrative (Source of Truth)
   * Creates a comprehensive master article that serves as the foundation
   * for all subsequent slot content generation.
   */
  async generateCoreNarrative(
    request: CoreNarrativeRequest
  ): Promise<CoreNarrativeResponse> {
    try {
      console.log('📝 Step 1: Generating Core Narrative...');
      console.log('User Config:', {
        productName: request.userConfig.productName,
        mainKeyword: request.userConfig.mainKeyword,
        tone: request.userConfig.tone,
      });

      const prompt = buildCoreNarrativePrompt(request);
      
      console.log('='.repeat(80));
      console.log('📤 Core Narrative Prompt:');
      console.log('='.repeat(80));
      console.log(prompt.substring(0, 500) + '...');
      console.log('='.repeat(80));

      const coreNarrative = await this.aiProvider.generateText(prompt, this.modelConfig);
      
      console.log('✅ Core Narrative Generated');
      console.log(`Length: ${coreNarrative.length} characters`);
      console.log(`Preview: ${coreNarrative.substring(0, 200)}...`);

      return {
        coreNarrative: coreNarrative.trim(),
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Core Narrative Generation Failed:', error);
      return {
        coreNarrative: '',
        success: false,
        error: error.message || 'Failed to generate core narrative',
      };
    }
  }

  /**
   * Step 2: Generate Slot Content from Core Narrative
   * Derives specific slot content from the core narrative to ensure consistency.
   */
  async generateSlot(request: SlotGenerationRequest): Promise<SlotGenerationResponse> {
    try {
      console.log(`📝 Step 2: Generating slot "${request.slotId}" (${request.slotType})...`);

      const prompt = buildSlotGenerationPrompt(request);
      
      console.log(`📤 Slot Prompt for "${request.slotId}":`);
      console.log(prompt.substring(0, 300) + '...');

      const content = await this.aiProvider.generateText(prompt, this.modelConfig);
      
      console.log(`✅ Slot "${request.slotId}" Generated`);
      console.log(`Content: ${content.substring(0, 100)}...`);

      return {
        content: content.trim(),
        slotId: request.slotId,
        success: true,
      };
    } catch (error: any) {
      console.error(`❌ Slot Generation Failed for "${request.slotId}":`, error);
      return {
        content: '',
        slotId: request.slotId,
        success: false,
        error: error.message || `Failed to generate content for slot ${request.slotId}`,
      };
    }
  }

  /**
   * Generate multiple slots in batch from the same core narrative.
   * More efficient than calling generateSlot multiple times.
   */
  async generateSlotsBatch(
    coreNarrative: string,
    slots: Array<{
      slotId: string;
      slotType: SlotType;
      slotInstructions?: string;
      maxLength?: number;
    }>,
    userConfig: UserConfig
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};

    // Generate slots sequentially to avoid rate limits
    // Add delay between requests to prevent hitting rate limits
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const request: SlotGenerationRequest = {
        slotId: slot.slotId,
        slotType: slot.slotType,
        coreNarrative,
        userConfig,
        slotInstructions: slot.slotInstructions,
        maxLength: slot.maxLength,
      };

      const response = await this.generateSlot(request);
      
      if (response.success) {
        results[slot.slotId] = response.content;
      } else {
        errors[slot.slotId] = response.error || 'Unknown error';
      }
      
      // Add delay between requests (except for the last one) to avoid rate limits
      if (i < slots.length - 1) {
        await sleep(500); // 500ms delay between slot generations
      }
    }

    if (Object.keys(errors).length > 0) {
      console.warn('⚠️ Some slots failed to generate:', errors);
    }

    return results;
  }

  /**
   * Complete two-step generation pipeline.
   * Generates core narrative first, then derives all requested slots from it.
   */
  async generateComplete(
    userConfig: UserConfig,
    slots: Array<{
      slotId: string;
      slotType: SlotType;
      slotInstructions?: string;
      maxLength?: number;
    }>,
    narrativeInstructions?: string
  ): Promise<{
    coreContent: CoreContentContext | null;
    slots: Record<string, string>;
    errors?: Record<string, string>;
  }> {
    // Step 1: Generate core narrative
    const coreResponse = await this.generateCoreNarrative({
      userConfig,
      narrativeInstructions,
    });

    if (!coreResponse.success || !coreResponse.coreNarrative) {
      return {
        coreContent: null,
        slots: {},
        errors: { core: coreResponse.error || 'Failed to generate core narrative' },
      };
    }

    // Create core content context
    const coreContent: CoreContentContext = {
      coreNarrative: coreResponse.coreNarrative,
      generatedAt: new Date().toISOString(),
      sourceConfig: userConfig,
    };

    // Step 2: Generate all slots from core narrative
    const slotsResults = await this.generateSlotsBatch(
      coreResponse.coreNarrative,
      slots,
      userConfig
    );

    // Extract errors from slots that failed
    const errors: Record<string, string> = {};
    slots.forEach(slot => {
      if (!slotsResults[slot.slotId]) {
        errors[slot.slotId] = 'Failed to generate slot content';
      }
    });

    return {
      coreContent,
      slots: slotsResults,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }

  /**
   * Map core narrative to template slots.
   * Distributes the narrative content across all defined slots in a single operation.
   * This is more efficient than generating slots individually.
   */
  async mapNarrativeToSlots(
    request: MapNarrativeToSlotsRequest
  ): Promise<MapNarrativeToSlotsResponse> {
    try {
      console.log('📝 Mapping Core Narrative to Template Slots...');
      console.log(`Number of slots: ${request.templateFields.length}`);
      console.log(`Slot IDs: ${request.templateFields.map(f => f.slotId).join(', ')}`);

      const prompt = buildMapNarrativeToSlotsPrompt(request);
      
      console.log('='.repeat(80));
      console.log('📤 Mapping Prompt:');
      console.log('='.repeat(80));
      console.log(prompt.substring(0, 500) + '...');
      console.log('='.repeat(80));

      const response = await this.aiProvider.generateText(prompt, this.modelConfig);
      
      console.log('✅ Mapping Response Received');
      console.log(`Response length: ${response.length} characters`);

      // Parse JSON response
      let jsonContent = extractJsonFromResponse(response);
      
      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('❌ Failed to parse mapping response:', parseError);
        console.error('Raw response:', response);
        return {
          slots: {},
          success: false,
          error: 'Failed to parse AI response as JSON',
        };
      }

      // Validate that all required slots are present
      const slotErrors: Record<string, string> = {};
      const slots: Record<string, string> = {};
      
      for (const field of request.templateFields) {
        const slotValue = parsed[field.slotId];
        
        if (slotValue === undefined || slotValue === null) {
          slotErrors[field.slotId] = 'Slot not found in AI response';
          continue;
        }
        
        // Ensure the value is a string
        if (typeof slotValue !== 'string') {
          // Try to convert to string if it's a number or other type
          if (typeof slotValue === 'number' || typeof slotValue === 'boolean') {
            slots[field.slotId] = String(slotValue).trim();
          } else if (typeof slotValue === 'object') {
            // If it's an object, try to stringify it (might be nested JSON)
            try {
              slots[field.slotId] = JSON.stringify(slotValue).trim();
            } catch {
              slotErrors[field.slotId] = 'Slot value is an object and cannot be converted to string';
            }
          } else {
            slotErrors[field.slotId] = `Slot value is of type ${typeof slotValue}, expected string`;
          }
        } else {
          // It's a string, trim it
          slots[field.slotId] = slotValue.trim();
        }
      }

      if (Object.keys(slotErrors).length > 0) {
        console.warn('⚠️ Some slots missing from response:', Object.keys(slotErrors));
      }

      console.log(`✅ Successfully mapped ${Object.keys(slots).length} slots`);

      return {
        slots,
        success: Object.keys(slotErrors).length === 0,
        slotErrors: Object.keys(slotErrors).length > 0 ? slotErrors : undefined,
      };
    } catch (error: any) {
      console.error('❌ Narrative Mapping Failed:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to map narrative to slots';
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        errorMessage = 'API rate limit exceeded. Please wait a few minutes and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The narrative might be too long. Please try again.';
      } else if (error.message?.includes('quota') || error.message?.includes('quota exceeded')) {
        errorMessage = 'API quota exceeded. Please check your Google AI API quota.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        slots: {},
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Regenerate a single slot with core narrative context.
   * Used when user clicks "Regenerate" on a specific field.
   */
  async regenerateSlot(request: RegenerateSlotRequest): Promise<RegenerateSlotResponse> {
    try {
      console.log(`🔄 Regenerating slot "${request.slotId}" (${request.slotType})...`);

      const prompt = buildRegenerateSlotPrompt(request);
      
      console.log(`📤 Regeneration Prompt for "${request.slotId}":`);
      console.log(prompt.substring(0, 300) + '...');

      const content = await this.aiProvider.generateText(prompt, this.modelConfig);
      
      console.log(`✅ Slot "${request.slotId}" Regenerated`);
      console.log(`Content: ${content.substring(0, 100)}...`);

      return {
        content: content.trim(),
        success: true,
      };
    } catch (error: any) {
      console.error(`❌ Slot Regeneration Failed for "${request.slotId}":`, error);
      return {
        content: '',
        success: false,
        error: error.message || `Failed to regenerate slot ${request.slotId}`,
      };
    }
  }
}

/**
 * Factory function to create a ContentGenerator instance.
 * Provides a convenient way to instantiate with default or custom configuration.
 */
export function createContentGenerator(
  modelConfig?: Partial<AIModelConfig>,
  aiProvider?: AIModelProvider
): ContentGenerator {
  return new ContentGenerator(aiProvider, modelConfig);
}
