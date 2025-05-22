import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/[...nextauth]/authOptions';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { getAuthUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = getAuthUser(session);
    
    if (!user?.spotifyToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const type = searchParams.get('type') || 'track';
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    // Ensure limit is one of the accepted values
    const limit = limitParam <= 20 ? limitParam : 20;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }
    
    // Initialize Spotify API client with user's token
    const spotifyApi = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      {
        access_token: user.spotifyToken,
        expires_in: 3600,
        token_type: 'Bearer',
        refresh_token: user.refresh_token || 'dummy-refresh-token', // Spotify SDK requires this field
      }
    );
    
    // Perform search
    const searchResult = await spotifyApi.search(
      query,
      [type as any],
      undefined,
      limit as any
    );
    
    return NextResponse.json(searchResult);
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return NextResponse.json(
      { error: 'Failed to search Spotify' },
      { status: 500 }
    );
  }
}