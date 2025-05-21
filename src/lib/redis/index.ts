/**
 * Check if Redis is available
 * @returns Promise<boolean> True if Redis is available, false otherwise
 */
export async function isRedisAvailable(): Promise<boolean> {
  // Check if REDIS_URL is defined
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL environment variable is not defined. Redis features will be unavailable.');
    return false;
  }
  
  // For Bull, we don't need to explicitly check Redis connection
  // as Bull will handle connection errors internally
  return true;
}