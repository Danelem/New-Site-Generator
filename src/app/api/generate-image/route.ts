import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@/lib/generator/googleAI';

interface GenerateImageRequest {
  prompt: string;
  productName?: string;
  mainKeyword?: string;
  slotLabel?: string;
  dimensions?: { width?: number; height?: number };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();
    const { prompt, productName, mainKeyword, slotLabel, dimensions } = body;

    if (!prompt) {
      return Response.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { 
          error: 'GOOGLE_AI_API_KEY environment variable is not set',
          hint: 'Please add it to your .env.local file'
        },
        { status: 500 }
      );
    }

    // Try to use Gemini's image generation capabilities
    // Note: Image generation may require Vertex AI or Imagen API
    // For now, we'll try using Gemini's multimodal capabilities
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Build enhanced prompt with context
      let enhancedPrompt = prompt;
      if (productName) {
        enhancedPrompt = `Product: ${productName}. ${enhancedPrompt}`;
      }
      if (mainKeyword) {
        enhancedPrompt = `Theme: ${mainKeyword}. ${enhancedPrompt}`;
      }
      if (slotLabel) {
        enhancedPrompt = `For ${slotLabel}: ${enhancedPrompt}`;
      }
      
      // Add style guidance
      enhancedPrompt += `. Professional marketing image, high quality, suitable for supplement/health product website.`;
      
      if (dimensions?.width && dimensions?.height) {
        enhancedPrompt += ` Aspect ratio: ${dimensions.width}:${dimensions.height}.`;
      }

      // Try using Gemini Nano Banana (Gemini 2.5 Flash Image) for image generation
      // This model supports direct image generation through the Gemini API
      const modelNames = [
        'gemini-2.5-flash-image',        // Nano Banana - primary model for image generation
        'gemini-2.5-flash-image-exp',    // Experimental version
        'gemini-2.0-flash-exp',          // Fallback: Gemini 2.0 Flash experimental
        'gemini-1.5-flash-latest',       // Fallback: Latest flash model
      ];

      let model;
      let successfulModel: string | null = null;
      let lastError: any = null;

      // Try each model until one works
      for (const modelName of modelNames) {
        try {
          console.log(`🔄 Trying image generation model: ${modelName}`);
          model = genAI.getGenerativeModel({ model: modelName });
          
          // Generate image using the prompt
          const result = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{
                text: enhancedPrompt
              }]
            }]
          });

          const response = await result.response;
          
          // Check if response contains image data
          // Gemini image generation models return images in the response parts
          const candidates = response.candidates || [];
          
          for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            
            // Look for image in the response parts
            for (const part of parts) {
              // Check if part contains inline data (base64 image)
              if (part.inlineData) {
                const imageData = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
                
                // Return base64 data URL
                const dataUrl = `data:${mimeType};base64,${imageData}`;
                
                console.log(`✅ Image generated successfully using model: ${modelName}`);
                return Response.json({
                  success: true,
                  imageData: dataUrl,
                  model: modelName,
                  mimeType: mimeType
                });
              }
              
              // Some models might return image as text (URL or base64)
              if (part.text) {
                const text = part.text.trim();
                
                // Check if it's a base64 image data URL
                if (text.startsWith('data:image/')) {
                  console.log(`✅ Image generated successfully using model: ${modelName}`);
                  return Response.json({
                    success: true,
                    imageData: text,
                    model: modelName
                  });
                }
                
                // Check if it's a URL
                if (text.startsWith('http://') || text.startsWith('https://')) {
                  console.log(`✅ Image URL generated successfully using model: ${modelName}`);
                  return Response.json({
                    success: true,
                    imageUrl: text,
                    model: modelName
                  });
                }
              }
            }
          }
          
          // Also check the response object directly for image data
          // Some Gemini models might return images differently
          const responseText = response.text();
          if (responseText) {
            // Check if response text contains base64 image
            const base64Match = responseText.match(/data:image\/[^;]+;base64,[^\s"']+/);
            if (base64Match) {
              console.log(`✅ Image found in response text using model: ${modelName}`);
              return Response.json({
                success: true,
                imageData: base64Match[0],
                model: modelName
              });
            }
          }

          // If we got here, the model responded but didn't return an image
          // This might mean the model doesn't support image generation or needs different prompt
          console.log(`⚠️ Model ${modelName} responded but no image found in response`);
          lastError = new Error(`Model ${modelName} did not return image data`);
          continue;

        } catch (error: any) {
          console.log(`❌ Model ${modelName} failed:`, error.message);
          lastError = error;
          
          // If it's a 404/model not found, try next model
          if (error.message?.includes('404') || 
              error.message?.includes('not found') ||
              error.message?.includes('is not found')) {
            continue;
          }
          
          // For other errors, throw immediately
          throw error;
        }
      }

      // If all models failed, return helpful error
      return Response.json({
        error: 'Image generation not available with current models',
        details: `Tried models: ${modelNames.join(', ')}. ${lastError?.message || 'No models returned image data'}`,
        suggestion: 'Nano Banana (gemini-2.5-flash-image) may not be available in your region or API plan',
        alternatives: [
          'Check if gemini-2.5-flash-image is enabled in Google AI Studio',
          'Try using Vertex AI Imagen API (requires Google Cloud setup)',
          'Use OpenAI DALL-E API',
          'Use Stability AI API'
        ]
      }, { status: 503 });

    } catch (error: any) {
      console.error('Image generation error:', error);
      
      // Check if it's an API/model availability issue
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return Response.json({
          error: 'Image generation model not available',
          details: 'Gemini image generation may require Vertex AI setup or Imagen API',
          suggestion: 'Consider using an alternative image generation service',
          alternatives: [
            'OpenAI DALL-E (requires OPENAI_API_KEY)',
            'Stability AI (requires STABILITY_API_KEY)',
            'Unsplash API for stock images (free)'
          ]
        }, { status: 503 });
      }

      throw error;
    }

  } catch (error: any) {
    console.error('Image generation error:', error);
    return Response.json(
      { 
        error: 'Image generation failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

