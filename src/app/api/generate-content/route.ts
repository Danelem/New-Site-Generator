import { NextRequest } from 'next/server';
import { createContentGenerator } from '@/lib/generator/ContentGenerator';
import type { UserConfig } from '@/lib/generator/types';
import { GoogleGenerativeAI } from '@/lib/generator/googleAI';

// Set max duration for Vercel (5 minutes = 300 seconds)
export const maxDuration = 300;
export const runtime = 'nodejs';

interface GenerateContentRequest {
  productName: string;
  mainKeyword: string;
  ageRange: string;
  gender: string;
  country?: string;
  state?: string;
  tone: string;
  // Optional: If true, uses the new two-step pipeline
  useCoreNarrative?: boolean;
}

interface GenerateContentResponse {
  headline: string;
  intro: string;
  benefits: string[];
  // Optional: Core narrative if using new pipeline
  coreNarrative?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateContentRequest = await request.json();
    const { 
      productName, 
      mainKeyword, 
      ageRange, 
      gender, 
      country, 
      state, 
      tone,
      useCoreNarrative = true, // Default to new two-step pipeline
    } = body;

    // Validate required fields
    if (!productName || !mainKeyword) {
      return Response.json(
        { error: 'productName and mainKeyword are required' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_AI_API_KEY is missing. Available env vars:', Object.keys(process.env).filter(k => k.includes('GOOGLE') || k.includes('AI')));
      return Response.json(
        { 
          error: 'GOOGLE_AI_API_KEY environment variable is not set. Please add it to your .env.local file and restart the dev server.',
          hint: 'Make sure the file is named exactly .env.local (with the dot at the start) and contains: GOOGLE_AI_API_KEY=your-key-here'
        },
        { status: 500 }
      );
    }

    // Use new two-step pipeline if enabled
    if (useCoreNarrative) {
      return await generateWithCoreNarrative(body);
    }

    // Fallback to legacy single-step generation for backward compatibility
    return await generateLegacy(body);
  } catch (error: any) {
    console.error('Content generation error:', error);
    console.error('Error stack:', error.stack);
    
    // Check if it's a module not found error
    if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
      return Response.json(
        { 
          error: 'Google AI package is not installed. Please run: npm install @google/generative-ai and restart the dev server.',
          details: error.message 
        },
        { status: 503 }
      );
    }
    
    // Check for API authentication errors
    if (error.message?.includes('API key') || error.message?.includes('authentication') || error.status === 401 || error.status === 403) {
      return Response.json(
        { 
          error: 'Invalid Google AI API key. Please check your GOOGLE_AI_API_KEY in .env.local',
          details: error.message 
        },
        { status: 401 }
      );
    }
    
    return Response.json(
      { 
        error: 'Content generation failed', 
        details: error.message || 'Unknown error',
        hint: 'Check the server console for more details'
      },
      { status: 500 }
    );
  }
}

/**
 * New two-step generation pipeline using Core Narrative.
 */
async function generateWithCoreNarrative(body: GenerateContentRequest): Promise<Response> {
  try {
    const generator = createContentGenerator();
    
    // Build user config
    const userConfig: UserConfig = {
      productName: body.productName,
      mainKeyword: body.mainKeyword,
      ageRange: body.ageRange,
      gender: body.gender,
      country: body.country,
      state: body.state,
      tone: body.tone,
    };

    // Define slots to generate
    const slots = [
      { slotId: 'headline', slotType: 'headline' as const, maxLength: 80 },
      { slotId: 'intro', slotType: 'paragraph' as const },
      { slotId: 'benefits', slotType: 'list' as const },
    ];

    // Generate complete content using two-step pipeline
    const result = await generator.generateComplete(userConfig, slots);

    if (!result.coreContent) {
      return Response.json(
        { 
          error: 'Failed to generate core narrative',
          details: result.errors?.core || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Parse benefits list (if it's a string, split by newlines)
    let benefits: string[] = [];
    if (result.slots.benefits) {
      benefits = result.slots.benefits
        .split('\n')
        .map(b => b.trim())
        .filter(b => b.length > 0 && !b.match(/^[-•*]\s*/)); // Remove bullet markers
      
      // If no benefits extracted, try to parse as JSON array
      if (benefits.length === 0) {
        try {
          benefits = JSON.parse(result.slots.benefits);
        } catch {
          // If parsing fails, use the raw content as a single benefit
          benefits = [result.slots.benefits];
        }
      }
    }

    // Ensure we have at least some benefits
    if (benefits.length === 0) {
      benefits = ['Increases muscle strength', 'Improves workout performance', 'Enhances muscle recovery'];
    }

    return Response.json({
      headline: result.slots.headline || 'Creatine Supplement Review',
      intro: result.slots.intro || '',
      benefits: benefits,
      coreNarrative: result.coreContent.coreNarrative, // Include for debugging/transparency
    });
  } catch (error: any) {
    console.error('Core narrative generation error:', error);
    return Response.json(
      { 
        error: 'Content generation failed', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Legacy single-step generation (for backward compatibility).
 */
async function generateLegacy(body: GenerateContentRequest): Promise<Response> {
  try {
    const { productName, mainKeyword, ageRange, gender, country, state, tone } = body;
    
    // Check for API key
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not set');
    }

    // Initialize Google AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try multiple model names - different API keys may have access to different models
    // Prioritizing Gemini 3 models
    const modelNames = [
      'gemini-3-pro-preview',     // Gemini 3 Pro Preview (primary)
      'gemini-3-pro',             // Gemini 3 Pro (fallback)
      'gemini-2.0-flash',         // Gemini 2.0 Flash (fallback)
      'gemini-1.5-flash-latest',  // Latest flash model (fallback)
      'gemini-1.5-pro-latest',    // Latest pro model (fallback)
      'gemini-1.5-flash',         // Flash without version (fallback)
      'gemini-1.5-pro',           // Pro without version (fallback)
      'gemini-pro',               // Legacy pro model (fallback)
    ];
    
    // Start with the first model
    let model = genAI.getGenerativeModel({ model: modelNames[0] });

    // Build audience context
    const audienceParts: string[] = [];
    if (ageRange && ageRange !== 'all') {
      audienceParts.push(`age range ${ageRange}`);
    }
    if (gender && gender !== 'all') {
      audienceParts.push(gender);
    }
    if (country) {
      audienceParts.push(country);
    }
    if (state) {
      audienceParts.push(state);
    }
    const audienceContext = audienceParts.length > 0
      ? `Target audience: ${audienceParts.join(', ')}. `
      : '';

    // Build tone instruction
    const toneInstructions: { [key: string]: string } = {
      serious: 'Use a serious, professional, and authoritative tone.',
      educational: 'Use an educational, informative, and helpful tone.',
      cheerful: 'Use a cheerful, upbeat, and positive tone.',
      direct: 'Use a direct, straightforward, and no-nonsense tone.',
    };
    const toneInstruction = toneInstructions[tone.toLowerCase()] || 'Use a professional tone.';

    const prompt = `You are a professional copywriter specializing in supplement and health product marketing. Generate compelling, accurate content for product landing pages.

Create marketing content for a creatine supplement product page.

Product Name: ${productName}
Main Keyword/Topic: ${mainKeyword}
${audienceContext}${toneInstruction}

Requirements:
1. Write a short, strong page headline (under 80 characters) that naturally incorporates the main keyword.
2. Write an intro paragraph (3-5 sentences) that introduces the product and addresses the main keyword/topic.
3. Provide a list of 5-8 key benefits of this creatine supplement. Each benefit should be a complete sentence or phrase (no bullet points in the text itself).

Make sure the content:
- Naturally incorporates the main keyword "${mainKeyword}" and related phrases
- Addresses the target audience appropriately
- Uses the requested tone: ${tone}
- Is accurate and compelling
- Avoids medical claims that require FDA approval

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, no explanations):
{
  "headline": "Your headline here",
  "intro": "Your intro paragraph here",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4", "Benefit 5"]
}`;

    // Log the prompt being sent to Gemini
    console.log('='.repeat(80));
    console.log('📤 Sending prompt to Gemini AI');
    console.log('='.repeat(80));
    console.log('PROMPT:', prompt);
    console.log('='.repeat(80));

    // Try to generate content - if model fails with 404, try next model
    let result: any;
    let response: any;
    let content: string | null = null;
    let lastError: any = null;
    let triedModels: string[] = [];
    let successfulModel: string | null = null;
    
    for (let i = 0; i < modelNames.length; i++) {
      const modelName = modelNames[i];
      triedModels.push(modelName);
      
      console.log(`\n🔄 Trying model: ${modelName}`);
      
      try {
        const currentModel = genAI.getGenerativeModel({ model: modelName });
        result = await currentModel.generateContent(prompt);
        response = await result.response;
        content = response.text();
        successfulModel = modelName;
        console.log(`✅ Success with model: ${modelName}`);
        console.log('📥 Raw response:', content);
        // Success! Break out of the loop
        break;
      } catch (generateError: any) {
        console.log(`❌ Model ${modelName} failed:`, generateError.message);
        lastError = generateError;
        // If it's a 404/model not found error, try the next model
        if (generateError.message?.includes('404') || 
            generateError.message?.includes('not found') ||
            generateError.message?.includes('is not found')) {
          // Continue to next model
          continue;
        } else {
          // For other errors (auth, rate limit, etc), throw immediately
          throw generateError;
        }
      }
    }
    
    // If we tried all models and none worked
    if (!content) {
      console.error('❌ All models failed. Tried:', triedModels.join(', '));
      return Response.json(
        { 
          error: 'No available Gemini models found for your API key',
          details: `Tried models: ${triedModels.join(', ')}. ${lastError?.message || 'All models returned 404 Not Found'}`,
          hint: 'Please check your Google AI API key permissions. You may need to enable specific models in Google AI Studio or Google Cloud Console.'
        },
        { status: 503 }
      );
    }

    // Log successful generation
    console.log('='.repeat(80));
    console.log(`✅ Content generated successfully using model: ${successfulModel}`);
    console.log('='.repeat(80));

    // Parse the JSON response - Google AI might wrap it in markdown code blocks
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let parsed: GenerateContentResponse;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse Google AI response:', parseError);
      console.error('Raw response:', content);
      return Response.json(
        { error: 'Failed to parse generated content', details: 'Response was not valid JSON' },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!parsed.headline || !parsed.intro || !Array.isArray(parsed.benefits)) {
      return Response.json(
        { error: 'Invalid response format from AI', details: 'Missing required fields' },
        { status: 500 }
      );
    }

    return Response.json({
      headline: parsed.headline,
      intro: parsed.intro,
      benefits: parsed.benefits,
    });
  } catch (error: any) {
    console.error('Legacy generation error:', error);
    return Response.json(
      { 
        error: 'Content generation failed', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
