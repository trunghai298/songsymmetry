import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/[...nextauth]/authOptions';
import { analyzeSongSimilarity } from '@/services/gemini';
import { getAuthUser } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = getAuthUser(session);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { song1, song2 } = body;
    
    if (!song1?.title || !song1?.artist || !song2?.title || !song2?.artist) {
      return NextResponse.json(
        { error: 'Both songs with title and artist are required' },
        { status: 400 }
      );
    }
    
    // Use AI to analyze song similarity
    const similarity = await analyzeSongSimilarity(song1, song2);
    
    return NextResponse.json({
      song1,
      song2,
      ...similarity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in AI similarity analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze song similarity' },
      { status: 500 }
    );
  }
}