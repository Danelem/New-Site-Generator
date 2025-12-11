# Content Generator Library

This directory contains the refactored AI content generation system that implements a **"Source-of-Truth" architecture** for ensuring narrative consistency across landing pages.

## Architecture Overview

### Two-Step Generation Pipeline

The system uses a two-step approach to ensure all content is consistent:

1. **Step 1: Generate Core Narrative (Source of Truth)**
   - Takes user inputs (Product Name, Demographics, Tone, Keywords, Pain Points)
   - Generates a single, comprehensive "Master Article" (800-1200 words)
   - This narrative covers: hook, problem/solution, scientific mechanism, objections, offer details
   - **This text is NOT displayed directly** - it serves as the context window for Step 2

2. **Step 2: Derive Slot Content**
   - When generating specific slots (e.g., `hero_headline`, `feature_bullet_1`), the AI does NOT generate from scratch
   - Instead, it "Extracts and adapts" or "Summarizes" from the **Core Content** generated in Step 1
   - This ensures all slots are consistent with each other and the overall narrative

## File Structure

```
generator/
├── types.ts              # TypeScript interfaces and types
├── prompts.ts            # Prompt engineering logic (separated from API calls)
├── ContentGenerator.ts   # Main service class
└── README.md             # This file
```

## Key Types

### `UserConfig`
Contains all user inputs needed for generation:
- Product information (name, URL, keyword)
- Demographics (age, gender, location)
- Tone and style preferences
- Optional pain points

### `CoreContentContext`
The "Source of Truth" object:
- `coreNarrative`: The master article text
- `generatedAt`: Timestamp
- `sourceConfig`: The user config used to generate it

### `SlotGenerationRequest`
Request for generating a specific slot:
- `slotId`: Identifier (e.g., 'hero_headline')
- `slotType`: Type (headline, paragraph, bullet, etc.)
- `coreNarrative`: The source narrative to derive from
- `userConfig`: Additional context
- Optional: `slotInstructions`, `maxLength`

## Usage Examples

### Basic Usage: Generate Core Narrative

```typescript
import { createContentGenerator } from '@/lib/generator/ContentGenerator';
import type { UserConfig } from '@/lib/generator/types';

const generator = createContentGenerator();

const userConfig: UserConfig = {
  productName: 'CreaPure Creatine',
  mainKeyword: 'creatine bloating',
  ageRange: '25-34',
  gender: 'male',
  tone: 'educational',
};

const result = await generator.generateCoreNarrative({
  userConfig,
});

if (result.success) {
  console.log('Core Narrative:', result.coreNarrative);
}
```

### Generate a Single Slot

```typescript
const slotResult = await generator.generateSlot({
  slotId: 'hero_headline',
  slotType: 'headline',
  coreNarrative: result.coreNarrative,
  userConfig,
  maxLength: 80,
});

if (slotResult.success) {
  console.log('Headline:', slotResult.content);
}
```

### Complete Pipeline (Core + Multiple Slots)

```typescript
const complete = await generator.generateComplete(
  userConfig,
  [
    { slotId: 'headline', slotType: 'headline', maxLength: 80 },
    { slotId: 'intro', slotType: 'paragraph' },
    { slotId: 'benefits', slotType: 'list' },
  ]
);

if (complete.coreContent) {
  console.log('Core Narrative:', complete.coreContent.coreNarrative);
  console.log('Generated Slots:', complete.slots);
}
```

## Modular AI Provider Support

The system uses an `AIModelProvider` interface, making it easy to swap AI providers:

```typescript
interface AIModelProvider {
  generateText(prompt: string, config: AIModelConfig): Promise<string>;
}
```

Currently implemented:
- `GoogleGeminiProvider` (default)

To add a new provider (e.g., OpenAI), implement the interface and pass it to the constructor:

```typescript
class OpenAIProvider implements AIModelProvider {
  async generateText(prompt: string, config: AIModelConfig): Promise<string> {
    // Implementation
  }
}

const generator = new ContentGenerator(new OpenAIProvider(), {
  modelName: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
});
```

## Error Handling

All generation methods return response objects with:
- `success: boolean`
- `error?: string` (if failed)

The system includes:
- Model fallback logic (tries multiple Gemini models)
- Comprehensive error logging
- Graceful degradation

## Prompt Engineering

Prompts are separated into `prompts.ts` for:
- Maintainability
- Testability
- Easy iteration without touching API logic

Key prompt functions:
- `buildCoreNarrativePrompt()`: Creates the master article prompt
- `buildSlotGenerationPrompt()`: Creates slot-specific prompts that enforce using core narrative

## Benefits of This Architecture

1. **Narrative Consistency**: All content derives from a single source, preventing contradictions
2. **Maintainability**: Clean separation of concerns (types, prompts, API calls)
3. **Flexibility**: Easy to swap AI providers or models
4. **Testability**: Each component can be tested independently
5. **Scalability**: Can generate any number of slots from the same core narrative

## Migration Notes

The API route (`/api/generate-content`) now uses the new pipeline by default (`useCoreNarrative: true`). For backward compatibility, you can set `useCoreNarrative: false` to use the legacy single-step generation.

## Future Enhancements

- [ ] Caching of core narratives (avoid regenerating if config hasn't changed)
- [ ] Parallel slot generation (currently sequential)
- [ ] Support for multi-language generation
- [ ] Template-specific slot definitions
- [ ] A/B testing different narrative approaches
