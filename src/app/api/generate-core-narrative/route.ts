import { NextRequest } from 'next/server';
import { createContentGenerator } from '@/lib/generator/ContentGenerator';
import type { UserConfig } from '@/lib/generator/types';

// Set max duration for Vercel (5 minutes = 300 seconds)
export const maxDuration = 300;
export const runtime = 'nodejs';

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
  const startTime = Date.now();
  console.log('🚀 Core narrative generation started at', new Date().toISOString());
  
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

    console.log('⏱️ Time elapsed before generator creation:', Date.now() - startTime, 'ms');
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

    console.log('⏱️ Time elapsed before generation:', Date.now() - startTime, 'ms');
    // Generate core narrative
    const result = await generator.generateCoreNarrative({ userConfig });
    const elapsed = Date.now() - startTime;
    console.log('⏱️ Total time elapsed:', elapsed, 'ms');

    if (!result.success) {
      return Response.json(
        { 
          error: 'Failed to generate core narrative',
          details: result.error || 'Unknown error',
          elapsedMs: elapsed
        },
        { status: 500 }
      );
    }

    return Response.json({
      coreNarrative: result.coreNarrative,
      elapsedMs: elapsed,
    });
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('❌ Core narrative generation error:', error);
    console.error('⏱️ Time elapsed before error:', elapsed, 'ms');
    return Response.json(
      { 
        error: 'Content generation failed', 
        details: error.message || 'Unknown error',
        elapsedMs: elapsed
      },
      { status: 500 }
    );
  }
}
