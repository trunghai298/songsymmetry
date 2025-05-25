import { NextRequest, NextResponse } from 'next/server';
import { updateStationTracksToSpotifyIds } from '@/lib/spotify-track-resolver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId } = body;

    console.log('Starting station tracks Spotify ID update...');
    
    const result = await updateStationTracksToSpotifyIds(stationId);
    
    return NextResponse.json({
      success: true,
      message: 'Station tracks updated to use Spotify IDs',
      stats: {
        total: result.total,
        updated: result.updated,
        failed: result.failed,
        successRate: result.total > 0 ? Math.round((result.updated / result.total) * 100) : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating station tracks to Spotify IDs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update station tracks',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return info about the endpoint
  return NextResponse.json({
    description: 'Update station tracks to use Spotify IDs instead of ChartMasters IDs',
    usage: {
      method: 'POST',
      body: {
        stationId: 'string (optional) - Update specific station, or all stations if omitted'
      }
    },
    note: 'This will search Spotify for each track and update the trackId field with real Spotify track IDs'
  });
}