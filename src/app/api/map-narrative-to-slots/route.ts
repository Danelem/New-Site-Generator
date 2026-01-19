import { NextRequest } from 'next/server';
import { createContentGenerator } from '@/lib/generator/ContentGenerator';
import { getTemplateFields } from '@/lib/generator/templateFields';
import { getTemplateConfigById } from '@/lib/templates/registry';
import type { TemplateConfig } from '@/lib/templates/types';
import type { UserConfig } from '@/lib/generator/types';
import type { TemplateId } from '@/lib/templates/registry';

// Set max duration for Vercel (5 minutes = 300 seconds)
export const maxDuration = 300;
export const runtime = 'nodejs';

interface MapNarrativeToSlotsRequest {
  coreNarrative: string;
  templateId: TemplateId;
  productName: string;
  mainKeyword: string;
  ageRange: string;
  gender: string;
  country?: string;
  state?: string; // Legacy: single state
  targetStates?: string[]; // Array of US states for regional targeting
  tone: string;
  templateSlots?: Array<{ id: string; label: string; type: string }>; // For uploaded templates, send slots from client
}

export async function POST(request: NextRequest) {
  try {
    const body: MapNarrativeToSlotsRequest = await request.json();
    const { 
      coreNarrative, 
      templateId, 
      productName, 
      mainKeyword, 
      ageRange, 
      gender, 
      country, 
      state,
      targetStates,
      tone,
      templateSlots
    } = body;

    // Validate required fields
    if (!coreNarrative || !coreNarrative.trim()) {
      return Response.json(
        { error: 'coreNarrative is required' },
        { status: 400 }
      );
    }

    if (!templateId) {
      return Response.json(
        { error: 'templateId is required' },
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

    // Get template configuration (system or uploaded)
    let template: TemplateConfig | null = null;
    
    // First try system templates
    template = getTemplateConfigById(templateId) ?? null;
    
    // If not found, try to construct from uploaded template slots
    if (!template && templateSlots && templateSlots.length > 0) {
      // Construct a minimal template config from uploaded slots
      template = {
        id: templateId,
        name: `Template ${templateId}`,
        htmlBody: '',
        slots: templateSlots.map(s => ({ id: s.id, type: s.type as any, label: s.label })),
        createdBy: 'uploaded',
      };
    }
    
    if (!template) {
      return Response.json(
        { error: `Template "${templateId}" not found` },
        { status: 404 }
      );
    }
    
    // Get template field definitions using unified function
    const templateFields = getTemplateFields(template);

    // Map narrative to slots
    const result = await generator.mapNarrativeToSlots({
      coreNarrative,
      templateFields,
      userConfig,
    });

    if (!result.success) {
      return Response.json(
        { 
          error: 'Failed to map narrative to slots',
          details: result.error || 'Unknown error',
          slotErrors: result.slotErrors,
        },
        { status: 500 }
      );
    }

    return Response.json({
      slots: result.slots,
      slotErrors: result.slotErrors,
    });
  } catch (error: any) {
    console.error('Narrative mapping error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause,
      error: error,
      errorType: typeof error,
      errorString: String(error),
    });
    
    // Provide better error message
    const errorStr = error?.message || error?.toString() || String(error) || 'Unknown error';
    const errorDetails = errorStr !== 'Unknown error' && errorStr !== '[object Object]' 
      ? errorStr 
      : `Error type: ${error?.name || typeof error}. Check server console for details.`;
    
    return Response.json(
      { 
        error: 'Failed to map narrative to slots', 
        details: errorDetails,
        hint: error?.stack ? 'Check server console for full error details' : 'See details field above for more information'
      },
      { status: 500 }
    );
  }
}
