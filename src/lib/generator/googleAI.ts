/**
 * Google AI Wrapper
 * This module ensures @google/generative-ai is properly imported and available
 * for serverless functions in Vercel deployment
 */

// Explicit top-level import to ensure the package is bundled
import { GoogleGenerativeAI } from '@google/generative-ai';

// Re-export to ensure it's not tree-shaken
export { GoogleGenerativeAI };

// Also export a default instance factory to ensure the import is used
export function createGoogleGenerativeAI(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}
