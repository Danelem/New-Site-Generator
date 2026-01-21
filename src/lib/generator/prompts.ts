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

  // Validate and filter out any undefined/null fields
  const validFields = templateFields.filter(
    (f): f is NonNullable<typeof f> => f != null && f.slotId != null
  );

  if (validFields.length === 0) {
    throw new Error('No valid template fields provided for narrative mapping');
  }

  // Build enhanced field descriptions with structure context
  const enhancedFieldDescriptions = validFields.map((field, index) => {
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
    
    // Add structure context based on label and slot type - match exact tag types from original template
    const labelLower = field.label.toLowerCase();
    const slotTypeLower = field.slotType.toLowerCase();
    
    // Check slot type first (more reliable than label parsing)
    if (slotTypeLower === 'list') {
      desc += ` [STRUCTURE: This is a LIST (UL or OL tag) - format as one item per line. Each line should be a complete bullet point or list item. Extract 3-8 key points from the narrative. REQUIRED - you must provide content for this slot.]`;
    } else if (labelLower.startsWith('h1 heading ')) {
      // H1 Heading 1, H1 Heading 2, etc. - these are H1 elements
      desc += ` [STRUCTURE: This is an H1 HEADING - must be ONE LINE only, concise and attention-grabbing. Do NOT include paragraph text. Preserve the H1 tag structure.]`;
    } else if (labelLower.startsWith('h2 subheading ')) {
      // H2 Subheading 1, H2 Subheading 2, etc. - these are H2 elements
      desc += ` [STRUCTURE: This is an H2 SUBHEADING - must be ONE LINE only, supporting the main heading. Do NOT include paragraph text. Preserve the H2 tag structure.]`;
    } else if (labelLower.startsWith('h3 section header ')) {
      // H3 Section Header 1, etc. - these are H3 elements
      desc += ` [STRUCTURE: This is an H3 SECTION HEADER - must be ONE LINE only, descriptive of the section. Do NOT include paragraph text. Preserve the H3 tag structure.]`;
    } else if (labelLower.startsWith('h4 subsection ') || labelLower.startsWith('h5 ') || labelLower.startsWith('h6 ')) {
      // H4, H5, H6 elements
      desc += ` [STRUCTURE: This is a HEADING - must be ONE LINE only. Do NOT include paragraph text. Preserve the original tag structure.]`;
    } else if (labelLower.startsWith('paragraph ')) {
      // Paragraph 1, Paragraph 2, etc. - these are P elements
      desc += ` [STRUCTURE: This is a PARAGRAPH (P tag) - must be a FULL PARAGRAPH with multiple sentences. This is NOT a heading. Preserve the P tag structure.]`;
    } else if (labelLower.startsWith('list ') || labelLower.includes(' list ')) {
      // Catch "List 1", "UL List 1", "OL List 1", etc.
      desc += ` [STRUCTURE: This is a LIST (UL or OL tag) - format as one item per line. Each line should be a complete bullet point or list item. Extract 3-8 key points from the narrative. REQUIRED - you must provide content for this slot.]`;
    } else if (labelLower.startsWith('content block ')) {
      desc += ` [STRUCTURE: This is a CONTENT BLOCK - extract multiple sentences or a full paragraph from the narrative that fits this section. REQUIRED - you must provide content for this slot.]`;
    } else if (labelLower.startsWith('image ')) {
      desc += ` [STRUCTURE: This is an IMAGE - provide a URL or image data]`;
    }
    
    return desc;
  }).join('\n');

  const prompt = `You are a professional copywriter. Your task is to extract and distribute content from a Core Narrative into specific template slots while PRESERVING THE EXACT STRUCTURE of the original template.

**Core Narrative (Source of Truth):**
${coreNarrative}

**Template Fields to Fill (with structure requirements):**
${enhancedFieldDescriptions}

**IMPORTANT: You must provide content for ALL ${validFields.length} slots listed above.**
- Text slots (headings, paragraphs) = extract text content
- List slots = extract 3-8 key points, one per line
- Content blocks = extract multiple sentences
- **DO NOT skip any slots, especially lists or content blocks**

**Target Audience:** ${userConfig.ageRange || 'all'} ${userConfig.gender || 'all'}${userConfig.country ? ` in ${userConfig.country}` : ''}${userConfig.targetStates && userConfig.targetStates.length > 0 ? ` (psychographic profile: ${userConfig.targetStates.join(', ')})` : ''}
**Tone:** ${userConfig.tone}
**Main Keyword:** ${userConfig.mainKeyword}
${userConfig.targetStates && userConfig.targetStates.length > 0 
  ? `\n**Psychographic Targeting:** Adapt tone, metaphors, and priorities to match the cultural mindset and values typical of ${userConfig.targetStates.length === 1 ? userConfig.targetStates[0] : userConfig.targetStates.join(', ')}. DO NOT mention city names, landmarks, or state names. Focus on values and mindset, not geography.`
  : ''}

**CRITICAL REQUIREMENTS:**
1. **YOU MUST INCLUDE ALL ${validFields.length} SLOTS IN YOUR RESPONSE.** Every slot ID listed above must have a value in your JSON response. Do NOT skip any slots, especially lists or content blocks.
2. Extract content from the Core Narrative for each field. Do NOT create new content that isn't in the narrative.
3. PRESERVE STRUCTURE: If a slot is labeled as "Headline" or "H1", it should be ONE LINE only. If it's "Paragraph" or "Body", it should be a full paragraph.
4. For headings (H1, H2, H3, etc.), extract or create a SINGLE LINE that captures the essence. Do NOT include paragraph text in headings.
5. For paragraphs, extract or adapt full paragraph content with multiple sentences.
6. **For lists (type: list, labels like "List 1", "UL List 1", "OL List 1"):** 
   - Extract 3-8 key points from the narrative
   - Format as one item per line (each line is a bullet point)
   - Each line should be a complete sentence or phrase
   - Example format:
     "Key benefit 1 from narrative
     Key benefit 2 from narrative
     Key benefit 3 from narrative"
   - If the narrative doesn't have enough list items, extract and adapt related points from the narrative
   - **DO NOT skip list slots - they are required**
7. **For content blocks:** Extract the main content from the narrative that fits that section. This can be multiple sentences or paragraphs combined. **DO NOT skip content blocks - they are required**
8. Maintain consistency - all fields should align with the same narrative thread.
9. Respect length constraints where specified.
10. Use the exact slot IDs provided as keys in your response. **DO NOT use different slot IDs or skip any slots.**
11. **CRITICAL: DO NOT include HTML tags in your response.** Return ONLY plain text content. The template already has the HTML structure (H1, H2, P, UL, OL tags). You should provide just the text that goes inside those tags. For example, return "My Heading Text" NOT "<h1>My Heading Text</h1>".

**Response Format:**
You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no explanations). **INCLUDE ALL ${validFields.length} SLOTS - DO NOT SKIP ANY:**

{
${validFields.length > 0 ? `  "${validFields[0].slotId}": "extracted content for first field"` : ''}${validFields.length > 1 ? `,\n  "${validFields[1].slotId}": "extracted content for second field"` : ''}${validFields.length > 2 ? `,\n  "${validFields[2].slotId}": "extracted content for third field"` : ''}${validFields.length > 3 ? `,\n  ...` : ''}${validFields.length > 1 ? `,\n  "${validFields[validFields.length - 1].slotId}": "extracted content for last field"` : ''}
}

**CRITICAL: VERIFICATION CHECKLIST:**
1. Count the keys in your JSON response - you must have exactly ${validFields.length} keys
2. Every slot ID from the list above must appear as a key in your JSON
3. For list slots, provide multiple lines (one item per line)
4. For content blocks, provide substantial content (multiple sentences)
5. If a slot seems difficult, extract the most relevant content from the narrative - DO NOT skip it

**REQUIRED SLOT IDs - YOU MUST INCLUDE ALL OF THESE IN YOUR JSON RESPONSE:**
${validFields.map((f, i) => {
  const isList = f.slotType === 'list';
  const isContentBlock = f.label.toLowerCase().includes('content block');
  const marker = (isList || isContentBlock) ? ' ⚠️ REQUIRED' : '';
  return `${i + 1}. "${f.slotId}" (${f.slotType}): ${f.label}${marker}`;
}).join('\n')}

**BEFORE SUBMITTING YOUR RESPONSE:**
1. Verify your JSON has exactly ${validFields.length} keys
2. Check that every slot ID listed above appears in your JSON
3. Pay special attention to list slots and content blocks - they are often missed but are REQUIRED
4. If you're missing any slots, go back and add them - DO NOT submit incomplete responses

Each value should be a string containing ONLY plain text content (no HTML tags). 
- Headlines = ONE LINE
- Paragraphs = FULL PARAGRAPHS  
- Lists = ONE ITEM PER LINE (each line is a bullet point, use newlines to separate items)
- Content Blocks = MULTIPLE SENTENCES OR PARAGRAPHS
- NO HTML TAGS

**FINAL REMINDER:** You must return JSON with exactly ${validFields.length} keys. Missing slots will cause errors. If you're unsure about a slot, extract the most relevant content from the narrative rather than skipping it.`;

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
6. **CRITICAL: DO NOT include HTML tags in your response.** Return ONLY plain text content. The template already has the HTML structure. You should provide just the text that goes inside the HTML tags. For example, return "My Heading Text" NOT "<h1>My Heading Text</h1>".

Respond with ONLY the regenerated content as plain text. No explanations, no markdown formatting, no HTML tags, just the content text.`;

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

/**
 * Sanitize JSON string by properly escaping control characters in string values.
 * This fixes issues where AI responses contain unescaped newlines, tabs, etc.
 * Uses a careful approach to preserve valid JSON structure and escape sequences.
 */
export function sanitizeJsonString(jsonString: string): string {
  let result = jsonString;
  let inString = false;
  let escapeNext = false;
  let output = '';
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    const code = char.charCodeAt(0);
    
    if (escapeNext) {
      // We're in an escape sequence, preserve it as-is
      output += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      // Start of escape sequence
      output += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      // Toggle string state
      inString = !inString;
      output += char;
      continue;
    }
    
    if (inString) {
      // We're inside a string value
      // Check if this is an unescaped control character
      if ((code >= 0x00 && code <= 0x1F) || code === 0x7F) {
        // Escape the control character
        if (char === '\n') {
          output += '\\n';
        } else if (char === '\r') {
          output += '\\r';
        } else if (char === '\t') {
          output += '\\t';
        } else if (char === '\b') {
          output += '\\b';
        } else if (char === '\f') {
          output += '\\f';
        } else {
          // Use Unicode escape for other control characters
          const hex = code.toString(16).padStart(4, '0');
          output += `\\u${hex}`;
        }
      } else {
        output += char;
      }
    } else {
      // Outside string, copy as-is
      output += char;
    }
  }
  
  return output;
}

/**
 * Repair malformed JSON by fixing common issues:
 * - Unterminated strings
 * - Unescaped quotes in strings
 * - Missing closing braces/brackets
 * - Truncated responses
 */
export function repairJsonString(jsonString: string): string {
  let result = jsonString.trim();
  let inString = false;
  let escapeNext = false;
  let output = '';
  let braceDepth = 0;
  let bracketDepth = 0;
  let lastChar = '';
  let stringStartPos = -1;
  
  // Find the start of the JSON object (first {)
  let startIdx = result.indexOf('{');
  if (startIdx === -1) {
    // No opening brace found, try to construct one
    return `{${result}}`;
  }
  
  // Find the last closing brace to handle truncation
  let endIdx = result.lastIndexOf('}');
  if (endIdx === -1 || endIdx < startIdx) {
    endIdx = result.length;
  } else {
    endIdx = endIdx + 1; // Include the closing brace
  }
  
  // Process the JSON content
  for (let i = startIdx; i < endIdx; i++) {
    const char = result[i];
    const code = char.charCodeAt(0);
    
    if (escapeNext) {
      output += char;
      escapeNext = false;
      lastChar = char;
      continue;
    }
    
    if (char === '\\') {
      output += char;
      escapeNext = true;
      lastChar = char;
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        stringStartPos = i;
      }
      inString = !inString;
      output += char;
      lastChar = char;
      continue;
    }
    
    if (inString) {
      // Inside a string - escape control characters
      if ((code >= 0x00 && code <= 0x1F) || code === 0x7F) {
        // Escape control characters
        if (char === '\n') {
          output += '\\n';
        } else if (char === '\r') {
          output += '\\r';
        } else if (char === '\t') {
          output += '\\t';
        } else if (char === '\b') {
          output += '\\b';
        } else if (char === '\f') {
          output += '\\f';
        } else {
          const hex = code.toString(16).padStart(4, '0');
          output += `\\u${hex}`;
        }
      } else {
        output += char;
      }
      lastChar = char;
    } else {
      // Outside string - track braces and brackets
      if (char === '{') {
        braceDepth++;
        output += char;
      } else if (char === '}') {
        braceDepth--;
        output += char;
      } else if (char === '[') {
        bracketDepth++;
        output += char;
      } else if (char === ']') {
        bracketDepth--;
        output += char;
      } else {
        output += char;
      }
      lastChar = char;
    }
  }
  
  // If we ended inside a string, try to close it intelligently
  if (inString) {
    // Check if we're in the middle of a value (after a colon)
    const lastColon = output.lastIndexOf(':');
    const lastComma = output.lastIndexOf(',');
    if (lastColon > lastComma) {
      // We're in a value, close the string
      output += '"';
      inString = false;
    } else {
      // We might be in a key, this is more problematic
      // Try to find where the string should have ended
      const remaining = result.substring(endIdx);
      const nextQuote = remaining.indexOf('"');
      if (nextQuote !== -1 && nextQuote < 100) {
        // Found a quote nearby, the string might have been split
        // Just close it here
        output += '"';
        inString = false;
      } else {
        // Truncated string, close it
        output += '"';
        inString = false;
      }
    }
  }
  
  // Close any unclosed braces or brackets
  while (braceDepth > 0) {
    // Before closing, check if we need a comma
    if (output.trim().length > 0 && !output.trim().endsWith(',') && !output.trim().endsWith('{') && !output.trim().endsWith('[')) {
      output += ',';
    }
    output += '}';
    braceDepth--;
  }
  while (bracketDepth > 0) {
    output += ']';
    bracketDepth--;
  }
  
  return output;
}
