/**
 * Rate Limiter for API Requests
 * Prevents hitting rate limits by throttling requests and managing retries
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerSecond: number;
  retryAfterSeconds?: number;
}

class RateLimiter {
  private requestTimestamps: number[] = [];
  private lastRequestTime: number = 0;
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig = {
    maxRequestsPerMinute: 60, // Google Gemini free tier: ~60 requests/minute
    maxRequestsPerSecond: 2,  // Conservative: 2 requests/second
  }) {
    this.config = config;
  }

  /**
   * Wait if necessary to respect rate limits
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // In serverless environments (Vercel), each function invocation is isolated
    // So rate limiting state doesn't persist. Use minimal delays to avoid timeouts.
    
    // Clean up old timestamps (older than 1 minute)
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );

    // Check per-second limit (minimal delay for serverless)
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelayBetweenRequests = 1000 / this.config.maxRequestsPerSecond; // milliseconds
    
    if (timeSinceLastRequest < minDelayBetweenRequests) {
      const waitTime = minDelayBetweenRequests - timeSinceLastRequest;
      // Only wait if it's significant (avoid micro-delays that add up)
      if (waitTime > 200) {
        console.log(`⏳ Rate limiter: Waiting ${waitTime.toFixed(0)}ms before next request...`);
        await this.sleep(waitTime);
      }
    }

    // Check per-minute limit (less strict in serverless)
    if (this.requestTimestamps.length >= this.config.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestRequest) + 100; // Add 100ms buffer
      if (waitTime > 0 && waitTime < 10000) { // Don't wait more than 10s in serverless
        console.log(`⏳ Rate limiter: Per-minute limit reached. Waiting ${(waitTime / 1000).toFixed(1)}s...`);
        await this.sleep(waitTime);
        // Clean up again after waiting
        this.requestTimestamps = this.requestTimestamps.filter(
          timestamp => Date.now() - timestamp < 60000
        );
      }
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
    this.lastRequestTime = Date.now();
  }

  private retryAttempts: Map<string, number> = new Map(); // Track retry attempts per operation

  /**
   * Handle rate limit error and calculate retry delay
   */
  async handleRateLimitError(error: any, operationId: string = 'default'): Promise<number> {
    // Get current retry attempt count
    const attemptCount = this.retryAttempts.get(operationId) || 0;
    this.retryAttempts.set(operationId, attemptCount + 1);
    
    // Check for Retry-After header in error response
    let retryAfter = this.config.retryAfterSeconds || 30; // Default: 30 seconds
    
    // Try to extract Retry-After from various error formats
    if (error.response?.headers?.get) {
      const retryAfterHeader = error.response.headers.get('Retry-After');
      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader, 10);
      }
    } else if (error.response?.headers?.['retry-after']) {
      retryAfter = parseInt(error.response.headers['retry-after'], 10);
    } else if (error.headers?.['retry-after']) {
      retryAfter = parseInt(error.headers['retry-after'], 10);
    } else if (error.retryAfter) {
      retryAfter = parseInt(String(error.retryAfter), 10);
    }

    // Exponential backoff: start with 15 seconds, increase with each attempt
    // Formula: baseDelay * (2 ^ attemptCount) with jitter
    const baseDelay = 15000; // 15 seconds base
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(attemptCount, 4)); // Cap at 2^4 = 16x
    const jitter = Math.random() * 5000; // Add 0-5s random jitter to avoid thundering herd
    const maxDelay = 120000; // 2 minutes max (to avoid Vercel timeout)
    
    // Use the larger of Retry-After or exponential backoff, but cap at maxDelay
    const delay = Math.min(
      Math.max(retryAfter * 1000, exponentialDelay) + jitter,
      maxDelay
    );

    console.log(`⏳ Rate limit hit (attempt ${attemptCount + 1}). Waiting ${(delay / 1000).toFixed(1)}s before retry...`);
    await this.sleep(delay);
    
    return delay;
  }

  /**
   * Reset retry attempts for an operation
   */
  resetRetryAttempts(operationId: string = 'default'): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Reset the rate limiter (useful for testing or after long pause)
   */
  reset(): void {
    this.requestTimestamps = [];
    this.lastRequestTime = 0;
  }

  /**
   * Get current request count in the last minute
   */
  getCurrentRequestCount(): number {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );
    return this.requestTimestamps.length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export a singleton instance
// Note: In serverless environments (Vercel), each function invocation is isolated,
// so rate limiting is per-instance. This is more lenient to avoid unnecessary delays.
export const rateLimiter = new RateLimiter({
  maxRequestsPerMinute: 50, // Conservative limit (Google free tier is ~60/min)
  maxRequestsPerSecond: 2, // Increased for serverless - each function is isolated
});













