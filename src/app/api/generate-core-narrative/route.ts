import { NextRequest } from 'next/server';
import { createContentGenerator } from '@/lib/generator/ContentGenerator';
import type { UserConfig } from '@/lib/generator/types';

interface GenerateCoreNarrativeRequest {
  productName: string;
  mainKeyword: string;
  ageRange: string;
  gender: string;
  country?: string;
  state?: string; // Legacy: single state
  targetStates?: string[]; // Array of US states for regional targeting
  tone: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCoreNarrativeRequest = await request.json();
    const { productName, mainKeyword, ageRange, gender, country, state, targetStates, tone } = body;

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
      return Response.json(
        { 
          error: 'GOOGLE_AI_API_KEY environment variable is not set',
          hint: 'Please add it to your .env.local file and restart the dev server.'
        },
        { status: 500 }
      );
    }

    const generator = createContentGenerator();
    
    // Build user config
    const userConfig: UserConfig = {
      productName,
      mainKeyword,
      ageRange,
      gender,
      country,
      state, // Legacy: single state
      targetStates: targetStates && targetStates.length > 0 
        ? targetStates 
        : (state ? [state] : undefined), // Use targetStates array if provided, otherwise convert single state
      tone,
    };

    // Generate core narrative
    const result = await generator.generateCoreNarrative({ userConfig });

    if (!result.success) {
      return Response.json(
        { 
          error: 'Failed to generate core narrative',
          details: result.error || 'Unknown error'
        },
        { status: 500 }
      );
    }

    return Response.json({
      coreNarrative: result.coreNarrative,
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
