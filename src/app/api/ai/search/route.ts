import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/[...nextauth]/authOptions';
import { searchSongsWithGemini } from '@/services/gemini';
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
    const { query, existingSongs } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }
    
    // Use Gemini to search for songs
    const searchResults = await searchSongsWithGemini(query, existingSongs);
    
    return NextResponse.json({
      results: searchResults,
      query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in AI song search:', error);
    return NextResponse.json(
      { error: 'Failed to search songs with AI' },
      { status: 500 }
    );
  }
}