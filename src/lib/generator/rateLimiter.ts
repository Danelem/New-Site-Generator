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

  /**
   * Handle rate limit error and calculate retry delay
   */
  async handleRateLimitError(error: any): Promise<number> {
    // Check for Retry-After header in error response
    let retryAfter = this.config.retryAfterSeconds || 60; // Default: 60 seconds
    
    if (error.response?.headers?.get) {
      const retryAfterHeader = error.response.headers.get('Retry-After');
      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader, 10);
      }
    } else if (error.response?.headers?.['retry-after']) {
      retryAfter = parseInt(error.response.headers['retry-after'], 10);
    }

    // Exponential backoff: start with 30 seconds, double each time
    const baseDelay = 30000; // 30 seconds
    const maxDelay = 300000; // 5 minutes max
    
    // Use the larger of Retry-After or exponential backoff
    const delay = Math.min(
      Math.max(retryAfter * 1000, baseDelay),
      maxDelay
    );

    console.log(`⏳ Rate limit hit. Waiting ${(delay / 1000).toFixed(0)}s before retry...`);
    await this.sleep(delay);
    
    return delay;
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













