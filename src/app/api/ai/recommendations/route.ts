import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/[...nextauth]/authOptions';
import { generateSongRecommendations } from '@/services/gemini';
import { getAuthUser } from '@/lib/session';
import { MaxInt, SpotifyApi } from '@spotify/web-api-ts-sdk';

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
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const timeRange = (searchParams.get('timeRange') || 'medium_term') as 'short_term' | 'medium_term' | 'long_term';
    
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
    
    // Get user's top tracks from Spotify
    const topTracksData = await spotifyApi.currentUser.topItems("tracks", timeRange, 50 as MaxInt<50>);
    
    if (!topTracksData?.items || topTracksData.items.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: 'No listening history found. Listen to some songs on Spotify first!'
      });
    }
    
    // Format Spotify tracks for AI recommendations
    // Create a play count based on position (higher position = more plays)
    const formattedHistory = topTracksData.items.map((track, index) => ({
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      playCount: 100 - (index * 2) // Simulate play count based on ranking
    }));
    
    // Use AI to generate recommendations
    const recommendations = await generateSongRecommendations(formattedHistory, limit);
    
    return NextResponse.json({
      recommendations,
      basedOn: formattedHistory.slice(0, 10),
      timestamp: new Date().toISOString(),
      timeRange
    });
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}