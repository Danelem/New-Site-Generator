/**
 * Prompt engineering logic for content generation.
 * Separated from API calling logic for maintainability and testability.
 */

import type { 
  UserConfig, 
  SlotType, 
  SlotGenerationRequest, 
  CoreNarrativeRequest,
  TemplateFieldDefinition,
  MapNarrativeToSlotsRequest,
  RegenerateSlotRequest,
} from './types';

/**
 * Build the prompt for generating the core narrative (Step 1).
 * This creates a comprehensive "master article" that serves as the source of truth.
 */
export function buildCoreNarrativePrompt(request: CoreNarrativeRequest): string {
  const { userConfig, narrativeInstructions } = request;
  
  // Build audience context
  const audienceParts: string[] = [];
  if (userConfig.ageRange && userConfig.ageRange !== 'all') {
    audienceParts.push(`age range ${userConfig.ageRange}`);
  }
  if (userConfig.gender && userConfig.gender !== 'all') {
    audienceParts.push(userConfig.gender);
  }
  if (userConfig.country) {
    audienceParts.push(userConfig.country);
  }
  // Use targetStates array if available, otherwise fall back to single state
  if (userConfig.targetStates && userConfig.targetStates.length > 0) {
    audienceParts.push(userConfig.targetStates.join(', '));
  } else if (userConfig.state) {
    audienceParts.push(userConfig.state);
  }
  const audienceContext = audienceParts.length > 0
    ? `Target audience: ${audienceParts.join(', ')}. `
    : '';

  // Build psychographic customization instructions (not geographic)
  let regionalInstructions = '';
  if (userConfig.targetStates && userConfig.targetStates.length > 0) {
    const statesList = userConfig.targetStates.length === 1 
      ? userConfig.targetStates[0]
      : userConfig.targetStates.length === 2
      ? userConfig.targetStates.join(' and ')
      : `${userConfig.targetStates.slice(0, -1).join(', ')}, and ${userConfig.targetStates[userConfig.targetStates.length - 1]}`;
    
    regionalInstructions = `\n\n**PSYCHOGRAPHIC TARGETING (CRITICAL - NOT GEOGRAPHIC):**
The target audience fits the psychographic profile typical of ${statesList}. Your task is to analyze the sociology, lifestyle values, and cultural mindset associated with this region, then adapt the copy's tone, metaphors, and priorities accordingly.

**What to DO:**
- Analyze the underlying values and mindset (e.g., "Colorado" = active, outdoorsy, health-conscious, value-driven, rugged individualism; "New York" = fast-paced, efficiency-focused, status-driven, results-oriented; "Texas" = independent, practical, family-centric, no-nonsense)
- Adjust the tone to match these psychographic traits (e.g., more direct and efficient for fast-paced regions, more value-focused for cost-conscious regions, more aspirational for status-driven regions)
- Use metaphors and examples that resonate with these values (e.g., outdoor/active metaphors for health-conscious regions, efficiency/productivity metaphors for fast-paced regions)
- Prioritize messaging that aligns with their cultural mindset (e.g., emphasize independence and self-reliance for individualistic regions, emphasize family benefits for family-centric regions)

**What NOT to DO (STRICT PROHIBITION):**
- DO NOT mention specific city names (e.g., "Boulder", "Austin", "Denver", "Manhattan")
- DO NOT mention specific landmarks, local businesses, or regional institutions
- DO NOT mention the state name itself unless absolutely necessary for context
- DO NOT use niche local expressions or regional slang
- DO NOT create content that would alienate customers from other regions

**Goal:** The copy should resonate with the mindset and values of someone from this psychographic profile while remaining applicable and welcoming to a national US audience. The content must feel culturally aligned without being geographically exclusive.`;
  } else {
    regionalInstructions = '\n\n**AUDIENCE:** General US audience.';
  }

  // Build tone instruction
  const toneInstructions: Record<string, string> = {
    serious: 'Use a serious, professional, and authoritative tone.',
    educational: 'Use an educational, informative, and helpful tone.',
    cheerful: 'Use a cheerful, upbeat, and positive tone.',
    direct: 'Use a direct, straightforward, and no-nonsense tone.',
  };
  const toneInstruction = toneInstructions[userConfig.tone.toLowerCase()] || 'Use a professional tone.';

  // Build pain points context
  const painPointsText = userConfig.painPoints && userConfig.painPoints.length > 0
    ? `\n\nKey pain points to address: ${userConfig.painPoints.join(', ')}.`
    : '';

  const basePrompt = `You are a professional copywriter specializing in supplement and health product marketing. Your task is to create a comprehensive, cohesive master narrative for a product landing page.

Product Name: ${userConfig.productName}
Main Keyword/Topic: ${userConfig.mainKeyword}
${audienceContext}${toneInstruction}${painPointsText}${regionalInstructions}

**CRITICAL REQUIREMENTS:**

1. Create a complete, cohesive narrative that covers:
   - A compelling hook that addresses the main keyword/topic
   - The problem or concern the target audience faces
   - The scientific mechanism of how the product works
   - How this product specifically addresses the problem
   - Common objections and how to address them
   - The value proposition and offer details
   - A strong conclusion that reinforces the main message

2. The narrative must be:
   - Internally consistent (no contradictions)
   - Scientifically accurate (avoid FDA-prohibited medical claims)
   - Tailored to the target audience (${audienceContext || 'general audience'})
   - Written in the requested tone: ${userConfig.tone}
   - Naturally incorporates the keyword "${userConfig.mainKeyword}" throughout

3. Write this as a complete, flowing article (800-1200 words). This will serve as the "source of truth" from which all page sections will be derived.

${narrativeInstructions ? `\n**Additional Instructions:**\n${narrativeInstructions}\n` : ''}

Respond with ONLY the narrative text. Do not include headers, titles, or formatting. Write as a continuous, flowing article.`;

  return basePrompt;
}

/**
 * Build the prompt for generating a specific slot from the core narrative (Step 2).
 * This ensures all slot content is derived from and consistent with the core narrative.
 */
export function buildSlotGenerationPrompt(request: SlotGenerationRequest): string {
  const { slotId, slotType, coreNarrative, userConfig, slotInstructions, maxLength } = request;

  // Build slot-specific instructions based on type
  const slotTypeInstructions: Record<SlotType, string> = {
    headline: 'Write a compelling headline (under 80 characters) that captures the main hook from the core narrative.',
    subheadline: 'Write a supporting subheadline that expands on the headline.',
    paragraph: 'Write a paragraph that summarizes or extracts key points from the core narrative.',
    bullet: 'Write a concise bullet point that highlights a specific benefit or feature.',
    list: 'Extract and format key points as a list.',
    cta: 'Write a clear, action-oriented call-to-action.',
    'meta-description': 'Write a meta description (under 160 characters) for SEO.',
    quote: 'Extract or create a compelling quote from the narrative.',
  };

  const typeInstruction = slotTypeInstructions[slotType] || 'Extract relevant content from the core narrative.';

  // Build audience context
  const audienceParts: string[] = [];
  if (userConfig.ageRange && userConfig.ageRange !== 'all') {
    audienceParts.push(`age range ${userConfig.ageRange}`);
  }
  if (userConfig.gender && userConfig.gender !== 'all') {
    audienceParts.push(userConfig.gender);
  }
  // Use targetStates array if available, otherwise fall back to single state
  if (userConfig.targetStates && userConfig.targetStates.length > 0) {
    audienceParts.push(userConfig.targetStates.join(', '));
  } else if (userConfig.state) {
    audienceParts.push(userConfig.state);
  }
  const audienceContext = audienceParts.length > 0
    ? `Target audience: ${audienceParts.join(', ')}. `
    : '';

  const lengthConstraint = maxLength
    ? `\n\n**Length Constraint:** Maximum ${maxLength} characters.`
    : '';

  const customInstructions = slotInstructions
    ? `\n\n**Specific Instructions for this Slot:**\n${slotInstructions}`
    : '';

  const prompt = `You are a professional copywriter. Your task is to extract and adapt content from a provided Core Narrative to create a specific page element.

**Core Narrative (Source of Truth):**
${coreNarrative}

**Task:**
${typeInstruction}
${audienceContext}
${lengthConstraint}
${customInstructions}

**CRITICAL REQUIREMENTS:**
1. The content MUST be derived from and consistent with the Core Narrative above.
2. Do NOT introduce new information that contradicts or is not supported by the Core Narrative.
3. Maintain the same tone and messaging as the Core Narrative.
4. Ensure the content naturally incorporates the keyword "${userConfig.mainKeyword}" if relevant.
5. The content should be compelling and appropriate for the target audience.

Respond with ONLY the generated content. No explanations, no markdown formatting, just the content text.`;

  return prompt;
}

/**
 * Build the prompt for mapping core narrative to template slots.
 * This distributes the narrative content across all defined slots in a single operation.
 */
export function buildMapNarrativeToSlotsPrompt(request: MapNarrativeToSlotsRequest): string {
  const { coreNarrative, templateFields, userConfig } = request;

  // Build field descriptions for the AI
  const fieldDescriptions = templateFields.map(field => {
    let desc = `- ${field.slotId} (${field.slotType}): ${field.label}`;
    if (field.description) {
      desc += ` - ${field.description}`;
    }
    if (field.maxLength) {
      desc += ` [Max ${field.maxLength} chars]`;
    }
    if (field.instructions) {
      desc += ` [Note: ${field.instructions}]`;
    }
    return desc;
  }).join('\n');

  const prompt = `You are a professional copywriter. Your task is to extract and distribute content from a Core Narrative into specific template slots.

**Core Narrative (Source of Truth):**
${coreNarrative}

**Template Fields to Fill:**
${fieldDescriptions}

**Target Audience:** ${userConfig.ageRange || 'all'} ${userConfig.gender || 'all'}${userConfig.country ? ` in ${userConfig.country}` : ''}${userConfig.targetStates && userConfig.targetStates.length > 0 ? ` (psychographic profile: ${userConfig.targetStates.join(', ')})` : ''}
**Tone:** ${userConfig.tone}
**Main Keyword:** ${userConfig.mainKeyword}
${userConfig.targetStates && userConfig.targetStates.length > 0 
  ? `\n**Psychographic Targeting:** Adapt tone, metaphors, and priorities to match the cultural mindset and values typical of ${userConfig.targetStates.length === 1 ? userConfig.targetStates[0] : userConfig.targetStates.join(', ')}. DO NOT mention city names, landmarks, or state names. Focus on values and mindset, not geography.`
  : ''}

**CRITICAL REQUIREMENTS:**
1. Extract content from the Core Narrative for each field. Do NOT create new content that isn't in the narrative.
2. For each field, identify the most relevant section of the narrative and adapt it appropriately.
3. Maintain consistency - all fields should align with the same narrative thread.
4. Respect length constraints where specified.
5. Use the exact slot IDs provided as keys in your response.

**Response Format:**
You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no explanations):
{
  "${templateFields[0].slotId}": "extracted content for first field",
  "${templateFields[1].slotId}": "extracted content for second field",
  ...
}

Each value should be a string containing the extracted/adapted content for that slot.`;

  return prompt;
}

/**
 * Build the prompt for regenerating a single slot with core narrative context.
 * Used when user clicks "Regenerate" on a specific field.
 */
export function buildRegenerateSlotPrompt(request: RegenerateSlotRequest): string {
  const { slotId, slotType, coreNarrative, userConfig, regenerationInstructions, maxLength } = request;

  // Build slot-specific instructions based on type
  const slotTypeInstructions: Record<SlotType, string> = {
    headline: 'Write a compelling headline that captures the main hook from the core narrative.',
    subheadline: 'Write a supporting subheadline that expands on the headline.',
    paragraph: 'Write a paragraph that summarizes or extracts key points from the core narrative.',
    bullet: 'Write a concise bullet point that highlights a specific benefit or feature.',
    list: 'Extract and format key points as a list (one item per line).',
    cta: 'Write a clear, action-oriented call-to-action.',
    'meta-description': 'Write a meta description for SEO.',
    quote: 'Extract or create a compelling quote from the narrative.',
  };

  const typeInstruction = slotTypeInstructions[slotType] || 'Extract relevant content from the core narrative.';

  // Build tone instruction
  const toneInstructions: Record<string, string> = {
    serious: 'more serious and authoritative',
    educational: 'more educational and informative',
    cheerful: 'more cheerful and upbeat',
    direct: 'more direct and straightforward',
  };
  const toneModifier = toneInstructions[userConfig.tone.toLowerCase()] || `more ${userConfig.tone}`;

  const lengthConstraint = maxLength
    ? `\n\n**Length Constraint:** Maximum ${maxLength} characters.`
    : '';

  const customInstructions = regenerationInstructions
    ? `\n\n**Specific Regeneration Instructions:**\n${regenerationInstructions}`
    : `\n\n**Tone Adjustment:** Make it ${toneModifier} while maintaining consistency with the core narrative.`;

  const prompt = `You are a professional copywriter. Your task is to regenerate a specific page element using the Core Narrative as context.

**Core Narrative (Source of Truth):**
${coreNarrative}

**Slot to Regenerate:**
- Slot ID: ${slotId}
- Type: ${slotType}
- Task: ${typeInstruction}
${lengthConstraint}${customInstructions}

**Target Audience:** ${userConfig.ageRange || 'all'} ${userConfig.gender || 'all'}${userConfig.country ? ` in ${userConfig.country}` : ''}${userConfig.targetStates && userConfig.targetStates.length > 0 ? ` (psychographic profile: ${userConfig.targetStates.join(', ')})` : ''}
**Main Keyword:** ${userConfig.mainKeyword}
${userConfig.targetStates && userConfig.targetStates.length > 0 
  ? `\n**Psychographic Targeting:** Adapt tone, metaphors, and priorities to match the cultural mindset and values typical of ${userConfig.targetStates.length === 1 ? userConfig.targetStates[0] : userConfig.targetStates.join(', ')}. DO NOT mention city names, landmarks, or state names. Focus on values and mindset, not geography.`
  : ''}

**CRITICAL REQUIREMENTS:**
1. The content MUST be derived from and consistent with the Core Narrative above.
2. Do NOT introduce new information that contradicts or is not supported by the Core Narrative.
3. Maintain the same overall messaging as the Core Narrative.
4. Ensure the content naturally incorporates the keyword "${userConfig.mainKeyword}" if relevant.
5. The regenerated content should be compelling and appropriate for the target audience.

Respond with ONLY the regenerated content. No explanations, no markdown formatting, just the content text.`;

  return prompt;
}

/**
 * Helper to extract JSON from AI responses that might be wrapped in markdown.
 */
export function extractJsonFromResponse(response: string): string {
  let jsonContent = response.trim();
  
  // Remove markdown code blocks if present
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  return jsonContent;
}
