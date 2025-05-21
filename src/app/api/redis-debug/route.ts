import { NextRequest, NextResponse } from 'next/server';
import Bull from 'bull';
import { isRedisAvailable } from '@/lib/redis';

// API route handler for debugging Redis and Bull issues
export async function GET(request: NextRequest) {
  try {
    console.log('Debugging Redis and Bull...');
    
    // Check if Redis is available
    const available = await isRedisAvailable();
    if (!available) {
      return NextResponse.json({
        status: 'error',
        available: false,
        message: 'Redis URL is not configured',
      }, { status: 503 });
    }
    
    // Try to create a simple test queue
    const DEBUG_QUEUE = 'debug-queue';
    const queue = new Bull(DEBUG_QUEUE, {
      redis: process.env.REDIS_URL as string
    });
    
    try {
      // Add a simple job without any fancy options
      const job = await queue.add({ 
        test: true,
        timestamp: new Date().toISOString()
      });
      
      // Try to get job counts
      const counts = await queue.getJobCounts();
      
      // Get information about Redis connection
      let redisInfo;
      try {
        redisInfo = await queue.client.info();
      } catch (err) {
        redisInfo = `Error getting Redis info: ${err}`;
      }
      
      // Clean up
      await queue.close();
      
      return NextResponse.json({
        status: 'ok',
        job: {
          id: job.id,
          data: job.data
        },
        counts,
        timestamp: new Date().toISOString(),
        redisInfo: redisInfo?.substring(0, 500) + '...' // Limit length
      });
    } catch (err: any) {
      console.error('Error with Bull:', err);
      
      // Try to get more information about the Redis connection
      const redisUrl = process.env.REDIS_URL;
      
      return NextResponse.json({
        status: 'error',
        error: err.message || String(err),
        stack: err.stack,
        redisUrl: redisUrl ? redisUrl.replace(/:[^:]*@/, ':***@') : 'not set', // Hide password
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Redis debug error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Redis debug failed',
      error: error.message || String(error),
    }, { status: 500 });
  }
}