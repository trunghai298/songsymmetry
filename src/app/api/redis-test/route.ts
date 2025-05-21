import { NextRequest, NextResponse } from 'next/server';
import { isRedisAvailable } from '@/lib/redis';
import Redis from 'ioredis';

// API route handler for Redis connectivity test
export async function GET(request: NextRequest) {
  try {
    console.log('Testing Redis connectivity from API...');
    
    // Check if Redis is available
    const available = await isRedisAvailable();
    if (!available) {
      return NextResponse.json({
        status: 'error',
        available: false,
        message: 'Redis URL is not configured',
      }, { status: 503 });
    }
    
    // Create a temporary connection to test Redis directly
    const redisUrl = process.env.REDIS_URL;
    const redis = new Redis(redisUrl as string);
    
    try {
      // Run some basic Redis operations
      const testKey = `redis-test-${Date.now()}`;
      const testValue = `Hello from SongSymmetry at ${new Date().toISOString()}`;
      
      // Set a test value
      await redis.set(testKey, testValue, 'EX', 60); // Expire in 60 seconds
      
      // Get the test value back
      const retrievedValue = await redis.get(testKey);
      
      // Run a ping command
      const pingResult = await redis.ping();
      
      // Get some Redis info
      const info = await redis.info('server');
      const serverInfo = info
        .split('\n')
        .filter(line => 
          line.includes('redis_version') || 
          line.includes('uptime_in_seconds') ||
          line.includes('connected_clients')
        )
        .map(line => line.trim())
        .filter(Boolean);
      
      await redis.quit();
      
      return NextResponse.json({
        status: 'ok',
        available: true,
        test: {
          key: testKey,
          valueSet: testValue,
          valueRetrieved: retrievedValue,
          match: testValue === retrievedValue,
        },
        ping: pingResult,
        serverInfo,
        timestamp: new Date().toISOString(),
        message: 'Redis connection is working properly'
      });
    } catch (error) {
      await redis.quit();
      throw error;
    }
  } catch (error: any) {
    console.error('Redis test error:', error);
    
    return NextResponse.json({
      status: 'error',
      available: false,
      message: 'Redis test failed',
      error: error.message || String(error),
    }, { status: 500 });
  }
}