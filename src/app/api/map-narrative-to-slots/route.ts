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
      // Filter out any undefined/null slots
      const validSlots = templateSlots
        .filter((s): s is NonNullable<typeof s> => s != null && s.id != null && s.type != null)
        .map(s => ({ 
          id: s.id, 
          type: s.type as any, 
          label: s.label || s.id 
        }));
      
      if (validSlots.length === 0) {
        return Response.json(
          { error: 'No valid template slots provided' },
          { status: 400 }
        );
      }
      
      template = {
        id: templateId,
        name: `Template ${templateId}`,
        htmlBody: '',
        slots: validSlots,
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
    // This automatically filters out image and url slots (they don't need narrative content)
    const templateFields = getTemplateFields(template);
    
    // Validate that we have template fields to work with
    if (!templateFields || templateFields.length === 0) {
      const imageSlots = template.slots?.filter(s => s?.type === 'image').length || 0;
      const urlSlots = template.slots?.filter(s => s?.type === 'url').length || 0;
      const textSlots = (template.slots?.length || 0) - imageSlots - urlSlots;
      
      console.error('❌ No template fields found after processing:', {
        templateId,
        totalSlots: template.slots?.length || 0,
        textSlots,
        imageSlots,
        urlSlots,
        templateFieldsLength: templateFields?.length,
        allSlots: template.slots,
      });
      
      return Response.json(
        { 
          error: 'Failed to map narrative to slots',
          details: `Template "${templateId}" has no valid text content slots. Found ${template.slots?.length || 0} total slots (${imageSlots} images, ${urlSlots} links, ${textSlots} text slots), but none are valid for content generation. Please ensure your template has text-based content slots (headings, paragraphs, lists) defined.`,
          hint: `Image and URL slots are excluded from narrative mapping. You need at least one text, list, or rich-text slot.`,
        },
        { status: 400 }
      );
    }
    
    console.log(`✅ Found ${templateFields.length} content slots for mapping (excluded ${(template.slots?.length || 0) - templateFields.length} image/url slots)`);

    // Map narrative to slots
    const result = await generator.mapNarrativeToSlots({
      coreNarrative,
      templateFields,
      userConfig,
    });

    // Check if we have any slots mapped (partial success is allowed)
    const hasSlots = result.slots && Object.keys(result.slots).length > 0;
    const hasSlotErrors = result.slotErrors && Object.keys(result.slotErrors).length > 0;
    
    if (!result.success) {
      // Log the error details for debugging
      console.error('❌ Mapping failed or partial:', {
        success: result.success,
        error: result.error,
        slotsCount: result.slots ? Object.keys(result.slots).length : 0,
        slotErrorsCount: hasSlotErrors ? Object.keys(result.slotErrors).length : 0,
        slotErrors: result.slotErrors,
        templateFieldsCount: templateFields.length,
        templateId,
      });
      
      // If we have some slots, allow partial success
      if (hasSlots) {
        console.log(`⚠️ Partial success: ${Object.keys(result.slots).length} slots mapped, ${hasSlotErrors ? Object.keys(result.slotErrors).length : 0} failed`);
        return Response.json({
          slots: result.slots,
          slotErrors: result.slotErrors,
          warning: result.error || 'Some slots failed to map, but others succeeded. You can proceed and fill failed slots manually.',
        });
      }
      
      // Complete failure - no slots mapped
      const errorDetails = result.error || 'Unknown error occurred during mapping';
      
      return Response.json(
        { 
          error: 'Failed to map narrative to slots',
          details: errorDetails,
          slotErrors: result.slotErrors,
          hint: 'Check server console logs for detailed error information.',
        },
        { status: 500 }
      );
    }

    // Full success
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
