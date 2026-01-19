# Vercel Timeout Fixes - Complete Summary

## Problem
The application was timing out after 60 seconds in Vercel when generating the master narrative, even though it worked fine locally (15-20 seconds). The timeout was happening despite configuring `maxDuration` in `vercel.json`.

## Root Causes Identified

1. **Vercel timeout configuration not being applied correctly**
2. **Excessive retry logic** - 5 retries per model × 9 models = up to 45 attempts
3. **Too many model fallbacks** - Trying 9 different models sequentially
4. **Rate limiter adding unnecessary delays** in serverless environment
5. **No explicit timeout handling** on the Google AI API calls themselves

## Fixes Applied

### 1. Added `maxDuration` Export Directly in Route Files
**Files Modified:**
- `src/app/api/generate-core-narrative/route.ts`
- `src/app/api/generate-content/route.ts`
- `src/app/api/map-narrative-to-slots/route.ts`
- `src/app/api/regenerate-slot/route.ts`

**Change:**
```typescript
// Set max duration for Vercel (5 minutes = 300 seconds)
export const maxDuration = 300;
export const runtime = 'nodejs';
```

**Why:** Next.js App Router requires `maxDuration` to be exported from the route file itself. The `vercel.json` configuration is a backup, but the route-level export is the primary method.

### 2. Optimized Model Selection and Retry Logic
**File:** `src/lib/generator/ContentGenerator.ts`

**Changes:**
- **Reduced model list** from 9 models to 6 models (removed slowest models)
- **Removed retry logic** - Now tries each model only once (no retries)
- **Added explicit timeout wrapper** - 240 seconds (4 minutes) timeout on each API call
- **Better error handling** - Immediately tries next model on any error instead of retrying

**Before:**
- 5 retries per model × 9 models = up to 45 attempts
- Could take several minutes with retries

**After:**
- 1 attempt per model × 6 models = maximum 6 attempts
- 240-second timeout per attempt
- Total maximum time: ~24 minutes worst case, but typically succeeds on first model

### 3. Reduced Token Limits
**File:** `src/lib/generator/ContentGenerator.ts`

**Change:**
- Reduced `maxTokens` from 4000 to 3000
- This speeds up generation while still producing comprehensive content

### 4. Optimized Rate Limiter for Serverless
**File:** `src/lib/generator/rateLimiter.ts`

**Changes:**
- Reduced delays in serverless environments
- Added check to prevent waiting more than 10 seconds
- Minimal delays between requests (only if > 200ms)

**Why:** In serverless environments, each function invocation is isolated, so rate limiting state doesn't persist. Aggressive rate limiting was adding unnecessary delays.

### 5. Added Comprehensive Logging
**File:** `src/app/api/generate-core-narrative/route.ts`

**Changes:**
- Added timing logs at each step
- Logs elapsed time before and after generation
- Helps diagnose where time is being spent

### 6. Updated Vercel Configuration
**File:** `vercel.json`

**Note:** The `vercel.json` configuration is kept as a backup, but the route-level `maxDuration` exports are the primary method for Next.js App Router.

## Expected Performance

- **Local:** 15-20 seconds (unchanged)
- **Vercel:** Should complete in 20-40 seconds (slightly slower due to cold starts and network latency)
- **Timeout:** Now set to 5 minutes (300 seconds) instead of 60 seconds

## Testing Recommendations

1. **Deploy to Vercel** and test the core narrative generation
2. **Check Vercel logs** to see:
   - Which model is being used
   - How long each step takes
   - If timeout is still occurring
3. **Monitor the timing logs** in the console to identify bottlenecks

## If Timeout Still Occurs

If you still experience timeouts after these fixes:

1. **Check Vercel logs** to see if `maxDuration` is being recognized
2. **Verify environment variables** - Ensure `GOOGLE_AI_API_KEY` is set correctly
3. **Check Vercel plan limits** - Free tier has different limits than Pro
4. **Consider using streaming** - For very long content, consider streaming the response
5. **Reduce prompt complexity** - Simplify the prompt if it's extremely long

## Files Changed Summary

1. `src/app/api/generate-core-narrative/route.ts` - Added maxDuration export and logging
2. `src/app/api/generate-content/route.ts` - Added maxDuration export
3. `src/app/api/map-narrative-to-slots/route.ts` - Added maxDuration export
4. `src/app/api/regenerate-slot/route.ts` - Added maxDuration export
5. `src/lib/generator/ContentGenerator.ts` - Optimized model selection, removed retries, added timeout
6. `src/lib/generator/rateLimiter.ts` - Optimized for serverless environments
7. `vercel.json` - Kept as backup configuration

## Next Steps

1. Deploy these changes to Vercel
2. Test the core narrative generation
3. Monitor logs for any remaining issues
4. If successful, the timeout issue should be resolved
