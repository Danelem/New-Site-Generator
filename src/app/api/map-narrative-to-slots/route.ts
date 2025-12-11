import { NextRequest } from 'next/server';
import { createContentGenerator } from '@/lib/generator/ContentGenerator';
import { getCreatineReportFields, getUploadedTemplateFields } from '@/lib/generator/templateFields';
import { loadUploadedTemplates } from '@/lib/templates/uploadedStorage';
import type { UserConfig } from '@/lib/generator/types';
import type { TemplateId } from '@/lib/templates/registry';

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
      tone 
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

    // Get template field definitions
    let templateFields;
    if (templateId === 'creatine-report') {
      templateFields = getCreatineReportFields();
    } else {
      // Uploaded template
      const uploadedTemplates = loadUploadedTemplates();
      const template = uploadedTemplates.find(t => t.id === templateId);
      if (!template) {
        return Response.json(
          { error: `Template with id "${templateId}" not found` },
          { status: 404 }
        );
      }
      templateFields = getUploadedTemplateFields(template.slots);
    }

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
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    });
    return Response.json(
      { 
        error: 'Failed to map narrative to slots', 
        details: error.message || 'Unknown error',
        hint: error.stack ? 'Check server console for full error details' : undefined
      },
      { status: 500 }
    );
  }
}
