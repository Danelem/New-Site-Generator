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
  sanitizeJsonString,
  repairJsonString,
} from './prompts';
import { rateLimiter } from './rateLimiter';
import { GoogleGenerativeAI } from './googleAI';

/**
 * AI Model Provider Interface
 * Allows easy swapping of AI providers (Google Gemini, OpenAI, etc.)
 */
export interface AIModelProvider {
  generateText(prompt: string, config: AIModelConfig, operationId?: string): Promise<string>;
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
  async generateText(prompt: string, config: AIModelConfig, operationId: string = 'default'): Promise<string> {
    // Wait for rate limiter before making request (minimal delay in serverless)
    await rateLimiter.waitIfNeeded();
    
    const genAI = new GoogleGenerativeAI(config.apiKey);
    
    // Use the model name from config, with fallback to gemini-2.0-flash
    const modelName = config.modelName || 'gemini-2.0-flash';
    
    let lastError: any = null;
    
    // Add timeout wrapper (240 seconds = 4 minutes, leaving buffer for Vercel's 5min limit)
    const timeoutMs = 240000;
    
      // Try only gemini-2.0-flash - single attempt, no fallbacks
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens,
        },
      });
      
      // Wrap the API call in a timeout promise
      const generatePromise = (async () => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      })();
      
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs / 1000}s`)), timeoutMs);
      });
      
      const text = await Promise.race([generatePromise, timeoutPromise]);
      
      console.log(`✅ Successfully generated content using model: ${modelName}`);
      return text;
    } catch (error: any) {
      lastError = error;
      
      // If it's a timeout, throw immediately
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        console.log(`⏱️ Timeout with ${modelName}, aborting...`);
        throw new Error(`Request timed out after ${timeoutMs / 1000}s. The AI generation is taking too long.`);
      }
      
      // If it's a rate limit error, wait and retry once with exponential backoff
      if (error.message?.includes('429') || 
          error.message?.includes('Too Many Requests') ||
          error.message?.includes('rate limit') ||
          error.message?.includes('quota') ||
          error.status === 429 ||
          error.code === 429 ||
          error.statusCode === 429) {
        console.log(`⚠️ Rate limit hit for ${modelName}, waiting before retry...`);
        
        // Calculate retry delay with exponential backoff
        const retryDelay = await rateLimiter.handleRateLimitError(error, `model-${modelName}`);
        
        // Retry this model once after delay
        try {
          console.log(`🔄 Retrying ${modelName} after rate limit delay...`);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature: config.temperature ?? 0.7,
              maxOutputTokens: config.maxTokens,
            },
          });
          
          const generatePromise = (async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
          })();
          
          const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs / 1000}s`)), timeoutMs);
          });
          
          const text = await Promise.race([generatePromise, timeoutPromise]);
          console.log(`✅ Successfully generated content using model: ${modelName} (after rate limit retry)`);
          return text;
        } catch (retryError: any) {
          // If retry fails, throw the error - no fallback to other models
          lastError = retryError;
          throw new Error(`Failed to generate content with ${modelName} after retry: ${retryError.message || 'Unknown error'}`);
        }
      }
      
      // For all other errors (including 404/model not found), throw immediately - no fallbacks
      let errorMsg = 'Unknown error';
      if (lastError?.message) {
        errorMsg = lastError.message;
      } else if (typeof lastError === 'string') {
        errorMsg = lastError;
      } else if (lastError?.toString && typeof lastError.toString === 'function') {
        const str = lastError.toString();
        if (str !== '[object Object]') {
          errorMsg = str;
        }
      } else {
        try {
          errorMsg = JSON.stringify(lastError);
        } catch {
          errorMsg = 'Unknown error format';
        }
      }
      
      throw new Error(
        `Failed to generate content with ${modelName}. ` +
        `Error: ${errorMsg}`
      );
    }
  }
}

/**
 * Content Generator Service
 * Main service class for generating content using the two-step pipeline.
 * 
 * Uses a Hybrid Model Strategy:
 * - CREATIVE_MODEL (gemini-2.5-pro): For high-quality creative tasks (core narrative)
 * - FAST_MODEL (gemini-2.5-flash): For fast extraction tasks (slots, mapping)
 */
export class ContentGenerator {
  // Model constants for Hybrid Model Strategy
  private static readonly CREATIVE_MODEL = 'gemini-2.5-pro'; // High-quality reasoning (gemini-1.5-pro was shut down Sep 2025)
  private static readonly FAST_MODEL = 'gemini-2.5-flash';   // Speed/extraction (updated from deprecated gemini-2.0-flash)
  
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

    // Default model configuration (using Gemini 2.5 Flash)
    // Optimized for faster generation in serverless environments
    this.modelConfig = {
      modelName: 'gemini-2.5-flash', // Use gemini-2.5-flash as default
      apiKey,
      temperature: 0.7,
      maxTokens: 8192, // Increased to handle large JSON responses (e.g., 66+ slots)
      ...modelConfig,
    };
  }

  /**
   * Step 1: Generate Core Narrative (Source of Truth)
   * Creates a comprehensive master article that serves as the foundation
   * for all subsequent slot content generation.
   * Uses CREATIVE_MODEL for high-quality writing, with fallback to FAST_MODEL.
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

      // Use CREATIVE_MODEL for high-quality narrative generation
      const creativeConfig = {
        ...this.modelConfig,
        modelName: ContentGenerator.CREATIVE_MODEL,
      };
      
      let coreNarrative: string;
      let lastError: any = null;
      try {
        console.log(`🎨 Using ${ContentGenerator.CREATIVE_MODEL} for high-quality narrative generation...`);
        coreNarrative = await this.aiProvider.generateText(prompt, creativeConfig, 'generate-core-narrative');
        console.log(`✅ Core Narrative Generated with ${ContentGenerator.CREATIVE_MODEL}`);
      } catch (error: any) {
        // Fallback to FAST_MODEL if CREATIVE_MODEL fails (timeout, unavailable, etc.)
        lastError = error;
        console.warn(`⚠️ ${ContentGenerator.CREATIVE_MODEL} failed, falling back to ${ContentGenerator.FAST_MODEL}:`, error.message);
        try {
          const fastConfig = {
            ...this.modelConfig,
            modelName: ContentGenerator.FAST_MODEL,
          };
          coreNarrative = await this.aiProvider.generateText(prompt, fastConfig, 'generate-core-narrative');
          console.log(`✅ Core Narrative Generated with ${ContentGenerator.FAST_MODEL} (fallback)`);
        } catch (fallbackError: any) {
          // Both models failed - throw with detailed error
          lastError = fallbackError;
          console.error(`❌ Both ${ContentGenerator.CREATIVE_MODEL} and ${ContentGenerator.FAST_MODEL} failed`);
          console.error(`CREATIVE_MODEL error:`, error.message);
          console.error(`FAST_MODEL error:`, fallbackError.message);
          throw new Error(
            `Failed to generate core narrative. ${ContentGenerator.CREATIVE_MODEL} error: ${error.message || 'Unknown error'}. ` +
            `${ContentGenerator.FAST_MODEL} fallback error: ${fallbackError.message || 'Unknown error'}`
          );
        }
      }
      
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
   * Uses FAST_MODEL for speed-optimized extraction.
   */
  async generateSlot(request: SlotGenerationRequest): Promise<SlotGenerationResponse> {
    try {
      console.log(`📝 Step 2: Generating slot "${request.slotId}" (${request.slotType})...`);

      const prompt = buildSlotGenerationPrompt(request);
      
      console.log(`📤 Slot Prompt for "${request.slotId}":`);
      console.log(prompt.substring(0, 300) + '...');

      // Use FAST_MODEL for extraction tasks
      const fastConfig = {
        ...this.modelConfig,
        modelName: ContentGenerator.FAST_MODEL,
      };
      const content = await this.aiProvider.generateText(prompt, fastConfig, `generate-slot-${request.slotId}`);
      
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
      // Use operation-specific retry tracking for better throttling
      const operationId = `map-narrative-${Date.now()}`;
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
      
      // Reset retry attempts on successful generation
      rateLimiter.resetRetryAttempts(operationId);
      
      // Add delay between slot generations to avoid hitting rate limits
      if (i < slots.length - 1) {
        // Wait for rate limiter to ensure we don't exceed limits
        await rateLimiter.waitIfNeeded();
        // Additional small delay for batch operations (500ms total with rate limiter)
        await sleep(300);
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
   * Process a batch of slots (helper method for batch processing)
   */
  private async processSlotBatch(
    request: MapNarrativeToSlotsRequest,
    batchFields: Array<{ slotId: string; slotType: SlotType; label: string; description?: string; instructions?: string; maxLength?: number }>,
    batchNumber: number,
    totalBatches: number
  ): Promise<{ slots: Record<string, string>; errors: Record<string, string> }> {
    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} with ${batchFields.length} slots...`);
    
    const prompt = buildMapNarrativeToSlotsPrompt({
      ...request,
      templateFields: batchFields,
    });
    
    const operationId = `map-narrative-batch-${batchNumber}-${Date.now()}`;
    
    const fastConfig = {
      ...this.modelConfig,
      modelName: ContentGenerator.FAST_MODEL,
      maxTokens: 8192,
    };
    
    const response = await this.aiProvider.generateText(prompt, fastConfig, operationId);
    
    if (!response || response.trim().length === 0) {
      console.error(`❌ Empty response for batch ${batchNumber}`);
      const errors: Record<string, string> = {};
      batchFields.forEach(field => {
        errors[field.slotId] = 'AI returned empty response for this batch';
      });
      return { slots: {}, errors };
    }

    let jsonContent = extractJsonFromResponse(response);
    
    if (!jsonContent || jsonContent.trim().length === 0) {
      console.error(`❌ Empty JSON content for batch ${batchNumber}`);
      const errors: Record<string, string> = {};
      batchFields.forEach(field => {
        errors[field.slotId] = 'Failed to extract JSON from AI response';
      });
      return { slots: {}, errors };
    }

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError: any) {
      try {
        const sanitized = sanitizeJsonString(jsonContent);
        parsed = JSON.parse(sanitized);
      } catch (secondParseError: any) {
        try {
          const repaired = repairJsonString(jsonContent);
          parsed = JSON.parse(repaired);
        } catch (thirdParseError: any) {
          // Last resort: regex extraction
          const extracted: Record<string, string> = {};
          const keyValuePattern = /"([^"]+)":\s*"((?:[^"\\]|\\.|[\r\n])*?)"(?=\s*[,}])/gs;
          let match;
          
          while ((match = keyValuePattern.exec(jsonContent)) !== null) {
            const key = match[1];
            let value = match[2];
            value = value
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            extracted[key] = value;
          }
          
          if (Object.keys(extracted).length > 0) {
            parsed = extracted;
          } else {
            const errors: Record<string, string> = {};
            batchFields.forEach(field => {
              errors[field.slotId] = 'Failed to parse AI response as JSON';
            });
            return { slots: {}, errors };
          }
        }
      }
    }

    const slots: Record<string, string> = {};
    const errors: Record<string, string> = {};
    
    for (const field of batchFields) {
      const slotValue = parsed[field.slotId];
      
      if (slotValue === undefined || slotValue === null) {
        errors[field.slotId] = 'Slot not found in AI response';
        continue;
      }
      
      if (typeof slotValue !== 'string') {
        if (typeof slotValue === 'number' || typeof slotValue === 'boolean') {
          slots[field.slotId] = String(slotValue).trim();
        } else if (typeof slotValue === 'object') {
          try {
            slots[field.slotId] = JSON.stringify(slotValue).trim();
          } catch {
            errors[field.slotId] = 'Slot value is an object and cannot be converted to string';
          }
        } else {
          errors[field.slotId] = `Slot value is of type ${typeof slotValue}, expected string`;
        }
      } else {
        let cleanedValue = slotValue.trim();
        cleanedValue = cleanedValue.replace(/<[^>]*>/g, '');
        cleanedValue = cleanedValue
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&nbsp;/g, ' ');
        slots[field.slotId] = cleanedValue.trim();
      }
    }

    console.log(`✅ Batch ${batchNumber}/${totalBatches} completed: ${Object.keys(slots).length} slots, ${Object.keys(errors).length} errors`);
    return { slots, errors };
  }

  /**
   * Map core narrative to template slots.
   * Distributes the narrative content across all defined slots.
   * For large slot counts (30+), processes in batches to avoid token limits.
   */
  async mapNarrativeToSlots(
    request: MapNarrativeToSlotsRequest
  ): Promise<MapNarrativeToSlotsResponse> {
    try {
      console.log('📝 Starting narrative mapping...');
      console.log('Request details:', {
        hasTemplateFields: !!request.templateFields,
        templateFieldsType: typeof request.templateFields,
        templateFieldsLength: request.templateFields?.length,
        hasCoreNarrative: !!request.coreNarrative,
        narrativeLength: request.coreNarrative?.length,
        hasUserConfig: !!request.userConfig,
      });
      
      // Validate template fields
      if (!request.templateFields || !Array.isArray(request.templateFields) || request.templateFields.length === 0) {
        throw new Error('No template fields provided or template fields array is empty');
      }
      
      // Filter out any undefined/null fields
      const validFields = request.templateFields.filter(
        (f): f is NonNullable<typeof f> => f != null && f.slotId != null
      );
      
      if (validFields.length === 0) {
        throw new Error('No valid template fields found after filtering');
      }
      
      console.log('📝 Mapping Core Narrative to Template Slots...');
      console.log(`Number of slots: ${validFields.length}`);
      console.log(`Slot IDs: ${validFields.map(f => f.slotId).join(', ')}`);
      
      // Check if API key is available
      if (!this.modelConfig.apiKey) {
        throw new Error('GOOGLE_AI_API_KEY is not set. Please configure it in your environment variables.');
      }

      // Determine batch size: use smaller batches for very large slot counts
      // 20-25 slots per batch is safe to avoid token limits
      const BATCH_SIZE = 25;
      const useBatching = validFields.length > BATCH_SIZE;
      
      if (useBatching) {
        console.log(`📦 Large slot count detected (${validFields.length} slots). Processing in batches of ${BATCH_SIZE}...`);
        
        const batches: Array<typeof validFields> = [];
        for (let i = 0; i < validFields.length; i += BATCH_SIZE) {
          batches.push(validFields.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`📦 Split into ${batches.length} batches`);
        
        const allSlots: Record<string, string> = {};
        const allErrors: Record<string, string> = {};
        
        // Process batches sequentially to avoid rate limits
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const batchResult = await this.processSlotBatch(
            request,
            batch,
            i + 1,
            batches.length
          );
          
          // Merge results
          Object.assign(allSlots, batchResult.slots);
          Object.assign(allErrors, batchResult.errors);
          
          // Small delay between batches to avoid rate limits
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`✅ Batch processing complete: ${Object.keys(allSlots).length} slots mapped, ${Object.keys(allErrors).length} errors`);
        
        return {
          slots: allSlots,
          success: Object.keys(allErrors).length === 0,
          slotErrors: Object.keys(allErrors).length > 0 ? allErrors : undefined,
        };
      }

      // For smaller slot counts, use the original single-request approach
      const prompt = buildMapNarrativeToSlotsPrompt({
        ...request,
        templateFields: validFields,
      });
      
      console.log('='.repeat(80));
      console.log('📤 Mapping Prompt:');
      console.log('='.repeat(80));
      console.log(prompt.substring(0, 500) + '...');
      console.log('='.repeat(80));

      const operationId = `map-narrative-${Date.now()}`;
      
      const fastConfig = {
        ...this.modelConfig,
        modelName: ContentGenerator.FAST_MODEL,
        maxTokens: 8192,
      };
      const response = await this.aiProvider.generateText(prompt, fastConfig, operationId);
      
      console.log('✅ Mapping Response Received');
      console.log(`Response length: ${response.length} characters`);

      // Check if response is empty
      if (!response || response.trim().length === 0) {
        console.error('❌ Empty response from AI');
        return {
          slots: {},
          success: false,
          error: 'AI returned an empty response. Please try again.',
        };
      }

      // Parse JSON response
      let jsonContent = extractJsonFromResponse(response);
      
      // Check if extracted content is empty
      if (!jsonContent || jsonContent.trim().length === 0) {
        console.error('❌ Empty JSON content after extraction');
        console.error('Raw response:', response);
        return {
          slots: {},
          success: false,
          error: 'Failed to extract JSON from AI response. The response may not be in the expected format.',
        };
      }
      
      let parsed: Record<string, string>;
      try {
        // Try parsing as-is first
        parsed = JSON.parse(jsonContent);
        console.log(`📋 Parsed JSON with ${Object.keys(parsed).length} keys:`, Object.keys(parsed));
      } catch (parseError: any) {
        // If parsing fails, try sanitizing control characters
        console.warn('⚠️ Initial JSON parse failed, attempting to repair JSON...');
        console.warn('Parse error:', parseError?.message);
        
        try {
          // First try sanitizing control characters
          const sanitized = sanitizeJsonString(jsonContent);
          parsed = JSON.parse(sanitized);
          console.log(`✅ Successfully parsed after sanitization with ${Object.keys(parsed).length} keys:`, Object.keys(parsed));
        } catch (secondParseError: any) {
          // If sanitization didn't work, try full repair
          console.warn('⚠️ Sanitization failed, attempting full JSON repair...');
          console.warn('Second parse error:', secondParseError?.message);
          
          try {
            const repaired = repairJsonString(jsonContent);
            parsed = JSON.parse(repaired);
            console.log(`✅ Successfully parsed after repair with ${Object.keys(parsed).length} keys:`, Object.keys(parsed));
          } catch (thirdParseError: any) {
            // Last resort: try to extract key-value pairs using regex
            console.warn('⚠️ All JSON repair attempts failed, trying regex extraction as last resort...');
            console.warn('Third parse error:', thirdParseError?.message);
            
            try {
              // Try to extract key-value pairs using regex
              // This is a fallback for severely malformed JSON
              const extracted: Record<string, string> = {};
              
              // More robust pattern that handles:
              // - Multi-line values
              // - Unterminated strings (up to a reasonable limit)
              // - Escaped characters
              const keyValuePattern = /"([^"]+)":\s*"((?:[^"\\]|\\.|[\r\n])*?)"(?=\s*[,}])/gs;
              let match;
              
              while ((match = keyValuePattern.exec(jsonContent)) !== null) {
                const key = match[1];
                let value = match[2];
                // Unescape common escape sequences
                value = value
                  .replace(/\\n/g, '\n')
                  .replace(/\\r/g, '\r')
                  .replace(/\\t/g, '\t')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\')
                  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
                extracted[key] = value;
              }
              
              // If regex didn't find enough, try a more permissive approach
              // Look for patterns like "key": "value" even if value has issues
              if (Object.keys(extracted).length === 0) {
                const permissivePattern = /"([^"]+)":\s*"([^"]*)"?/g;
                while ((match = permissivePattern.exec(jsonContent)) !== null) {
                  const key = match[1];
                  const value = match[2] || '';
                  if (key && !extracted[key]) {
                    extracted[key] = value
                      .replace(/\\n/g, '\n')
                      .replace(/\\r/g, '\r')
                      .replace(/\\t/g, '\t')
                      .replace(/\\"/g, '"')
                      .replace(/\\\\/g, '\\');
                  }
                }
              }
              
              if (Object.keys(extracted).length > 0) {
                parsed = extracted;
                console.log(`✅ Extracted ${Object.keys(parsed).length} slots using regex fallback:`, Object.keys(parsed));
              } else {
                throw new Error('No valid key-value pairs found in response');
              }
            } catch (extractionError: any) {
              console.error('❌ Failed to parse mapping response after all repair attempts:', thirdParseError);
              console.error('Extraction error:', extractionError?.message);
              console.error('Parse error details:', {
                message: thirdParseError?.message,
                name: thirdParseError?.name,
                stack: thirdParseError?.stack,
              });
              console.error('Extracted JSON content (first 1000 chars):', jsonContent.substring(0, 1000));
              console.error('Raw response (first 500 chars):', response.substring(0, 500));
              
              // Try to provide more helpful error message
              const errorMsg = thirdParseError?.message || 'Invalid JSON format';
              const positionMatch = errorMsg.match(/position (\d+)/);
              if (positionMatch) {
                const pos = parseInt(positionMatch[1], 10);
                const contextStart = Math.max(0, pos - 100);
                const contextEnd = Math.min(jsonContent.length, pos + 100);
                console.error('Context around error position:', jsonContent.substring(contextStart, contextEnd));
                console.error('Character at position:', jsonContent[pos] || 'EOF');
              }
              
              return {
                slots: {},
                success: false,
                error: `Failed to parse AI response as JSON: ${errorMsg}. The AI response may be malformed or truncated. Please try regenerating the narrative or mapping again. If the issue persists, the AI response may be too long or contain invalid characters.`,
              };
            }
          }
        }
      }
      
      // Log expected vs actual slot IDs for debugging
      const expectedSlotIds = validFields.map(f => f.slotId);
      const actualSlotIds = Object.keys(parsed);
      const missingSlots = expectedSlotIds.filter(id => !actualSlotIds.includes(id));
      const extraSlots = actualSlotIds.filter(id => !expectedSlotIds.includes(id));
      
      if (missingSlots.length > 0) {
        console.warn('⚠️ Missing slots in AI response:', missingSlots);
        // Log details about missing slots
        missingSlots.forEach(slotId => {
          const field = validFields.find(f => f.slotId === slotId);
          console.warn(`  - Missing: ${slotId} (${field?.slotType || 'unknown'}): ${field?.label || 'unknown'}`);
        });
      }
      if (extraSlots.length > 0) {
        console.warn('ℹ️ Extra slots in AI response (not in template):', extraSlots);
      }
      
      // Log summary
      console.log(`📊 Slot mapping summary: ${actualSlotIds.length} returned, ${expectedSlotIds.length} expected, ${missingSlots.length} missing`);

      // Validate that all required slots are present
      const slotErrors: Record<string, string> = {};
      const slots: Record<string, string> = {};
      
      // Use validFields instead of request.templateFields
      for (const field of validFields) {
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
          // It's a string, trim it and remove any HTML tags that might have been included
          let cleanedValue = slotValue.trim();
          
          // Strip HTML tags if AI included them (shouldn't happen, but just in case)
          cleanedValue = cleanedValue.replace(/<[^>]*>/g, '');
          
          // Decode common HTML entities
          cleanedValue = cleanedValue
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ');
          
          slots[field.slotId] = cleanedValue.trim();
        }
      }

      if (Object.keys(slotErrors).length > 0) {
        console.warn('⚠️ Some slots failed to map:');
        Object.entries(slotErrors).forEach(([slotId, errorMsg]) => {
          const field = validFields.find(f => f.slotId === slotId);
          console.warn(`  - ${slotId} (${field?.label || 'unknown'}): ${errorMsg}`);
        });
        console.warn('Failed slot IDs:', Object.keys(slotErrors));
        console.warn('AI response keys:', Object.keys(parsed));
      }

      console.log(`✅ Successfully mapped ${Object.keys(slots).length} slots`);
      if (Object.keys(slotErrors).length > 0) {
        console.log(`⚠️ ${Object.keys(slotErrors).length} slots failed`);
      }

      return {
        slots,
        success: Object.keys(slotErrors).length === 0,
        slotErrors: Object.keys(slotErrors).length > 0 ? slotErrors : undefined,
      };
    } catch (error: any) {
      console.error('❌ Narrative Mapping Failed:', error);
      
      // Extract error information from various possible error formats
      let errorMessage: string | undefined;
      let errorDetails: any = {};
      
      // Try to extract error message from various formats
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.statusText) {
        errorMessage = error.statusText;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString && typeof error.toString === 'function') {
        const errorStr = error.toString();
        if (errorStr !== '[object Object]') {
          errorMessage = errorStr;
        }
      }
      
      // Extract additional error details
      errorDetails = {
        message: error?.message || error?.error?.message,
        name: error?.name,
        status: error?.status || error?.response?.status,
        statusText: error?.statusText || error?.response?.statusText,
        code: error?.code,
        response: error?.response?.data || error?.response,
        stack: error?.stack,
        error: error,
        errorType: typeof error,
        errorString: String(error),
        errorJSON: (() => {
          try {
            return JSON.stringify(error, Object.getOwnPropertyNames(error));
          } catch {
            return 'Could not stringify error';
          }
        })(),
      };
      
      console.error('Error details:', errorDetails);
      
      // Provide more specific error messages
      let finalErrorMessage = 'Failed to map narrative to slots';
      
      // Handle different error types
      const errorStr = errorMessage || String(error) || 'Unknown error';
      
      if (errorStr.includes('429') || errorStr.includes('rate limit') || errorStr.includes('Too Many Requests') || errorDetails.status === 429 || errorDetails.code === 429) {
        finalErrorMessage = 'API rate limit exceeded. The system will automatically retry with exponential backoff. Please wait a moment and try again if the issue persists.';
      } else if (errorStr.includes('timeout') || errorStr.includes('ETIMEDOUT') || errorStr.includes('Timeout')) {
        finalErrorMessage = 'Request timed out. The narrative might be too long. Please try again.';
      } else if (errorStr.includes('quota') || errorStr.includes('quota exceeded')) {
        finalErrorMessage = 'API quota exceeded. Please check your Google AI API quota and billing settings.';
      } else if (errorStr.includes('401') || errorStr.includes('403') || errorStr.includes('authentication') || errorStr.includes('API key') || errorStr.includes('permission') || errorDetails.status === 401 || errorDetails.status === 403) {
        finalErrorMessage = 'API authentication failed. Please check your GOOGLE_AI_API_KEY environment variable is set correctly.';
      } else if (errorStr.includes('404') || errorStr.includes('not found') || errorDetails.status === 404) {
        finalErrorMessage = 'AI model not found. Please check your API key has access to Gemini models.';
      } else if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('ECONNREFUSED') || errorStr.includes('ENOTFOUND')) {
        finalErrorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorStr && errorStr !== 'Unknown error' && errorStr !== '[object Object]' && errorStr.length < 500) {
        // Use the error message if it's meaningful and not too long
        finalErrorMessage = errorStr;
      } else {
        // Fallback: provide more context based on what we found
        const errorType = error?.name || errorDetails.name || typeof error;
        const statusInfo = errorDetails.status ? ` (HTTP ${errorDetails.status})` : '';
        const errorDesc = errorMessage && errorMessage.length < 200 ? `: ${errorMessage}` : '';
        
        if (errorType && errorType !== 'object' && errorType !== 'Object') {
          finalErrorMessage = `Failed to map narrative to slots. Error type: ${errorType}${statusInfo}${errorDesc}. Check server console for full details.`;
        } else {
          finalErrorMessage = `Failed to map narrative to slots. An unexpected error occurred${statusInfo}. Check server console for full details.`;
        }
      }
      
      // Ensure we always return a non-empty error message
      if (!finalErrorMessage || finalErrorMessage.trim().length === 0) {
        finalErrorMessage = `Failed to map narrative to slots. An unexpected error occurred. Check server console for details.`;
      }
      
      return {
        slots: {},
        success: false,
        error: finalErrorMessage,
      };
    }
  }

  /**
   * Regenerate a single slot with core narrative context.
   * Used when user clicks "Regenerate" on a specific field.
   * Uses FAST_MODEL for speed-optimized regeneration.
   */
  async regenerateSlot(request: RegenerateSlotRequest): Promise<RegenerateSlotResponse> {
    try {
      console.log(`🔄 Regenerating slot "${request.slotId}" (${request.slotType})...`);

      const prompt = buildRegenerateSlotPrompt(request);
      
      console.log(`📤 Regeneration Prompt for "${request.slotId}":`);
      console.log(prompt.substring(0, 300) + '...');

      // Use FAST_MODEL for extraction/regeneration tasks
      const fastConfig = {
        ...this.modelConfig,
        modelName: ContentGenerator.FAST_MODEL,
      };
      let content = await this.aiProvider.generateText(prompt, fastConfig, `regenerate-slot-${request.slotId}`);
      
      // Strip HTML tags if AI included them (shouldn't happen, but just in case)
      content = content.replace(/<[^>]*>/g, '');
      
      // Decode common HTML entities
      content = content
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
      
      console.log(`✅ Slot "${request.slotId}" Regenerated`);
      console.log(`Content: ${content.substring(0, 100)}...`);

      return {
        content: content,
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
