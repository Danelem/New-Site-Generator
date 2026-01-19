import { NextRequest } from 'next/server';
import { createContentGenerator } from '@/lib/generator/ContentGenerator';
import type { UserConfig, SlotType } from '@/lib/generator/types';

// Set max duration for Vercel (5 minutes = 300 seconds)
export const maxDuration = 300;
export const runtime = 'nodejs';

interface RegenerateSlotRequest {
  slotId: string;
  slotType: string;
  coreNarrative: string;
  productName: string;
  mainKeyword: string;
  ageRange: string;
  gender: string;
  country?: string;
  state?: string; // Legacy: single state
  targetStates?: string[]; // Array of US states for regional targeting
  tone: string;
  maxLength?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegenerateSlotRequest = await request.json();
    const { 
      slotId, 
      slotType, 
      coreNarrative, 
      productName, 
      mainKeyword, 
      ageRange, 
      gender, 
      country, 
      state,
      targetStates,
      tone,
      maxLength
    } = body;

    // Validate required fields
    if (!coreNarrative || !coreNarrative.trim()) {
      return Response.json(
        { error: 'coreNarrative is required' },
        { status: 400 }
      );
    }

    if (!slotId || !slotType) {
      return Response.json(
        { error: 'slotId and slotType are required' },
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

    // Regenerate slot
    const result = await generator.regenerateSlot({
      slotId,
      slotType: slotType as SlotType,
      coreNarrative,
      userConfig,
      maxLength,
    });

    if (!result.success) {
      return Response.json(
        { 
          error: 'Failed to regenerate slot',
          details: result.error || 'Unknown error'
        },
        { status: 500 }
      );
    }

    return Response.json({
      content: result.content,
    });
  } catch (error: any) {
    console.error('Slot regeneration error:', error);
    return Response.json(
      { 
        error: 'Failed to regenerate slot', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
