import { NextRequest, NextResponse } from 'next/server';
import { processDailyUpdate } from '@/lib/redis/direct-processing';

// Direct API route to run daily update without using Bull queue
export async function POST(request: NextRequest) {
  try {
    console.log('Received request to run daily update directly');
    
    const result = await processDailyUpdate();
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'Daily update completed successfully',
      result
    });
  } catch (error) {
    console.error('Error in direct daily update:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to process daily update',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}