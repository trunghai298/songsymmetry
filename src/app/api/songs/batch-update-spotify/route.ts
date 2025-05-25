import { NextRequest, NextResponse } from "next/server";
import { batchUpdateSongsSpotifyData } from "@/lib/utils/spotify-song-updater";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit = 10 } = body;

    // Validate limit
    if (limit > 50) {
      return NextResponse.json(
        { error: "Limit cannot exceed 50 songs per request" },
        { status: 400 }
      );
    }

    const result = await batchUpdateSongsSpotifyData(limit);

    return NextResponse.json({
      message: `Batch update completed: ${result.processed} songs updated, ${result.errors} errors`,
      ...result
    });

  } catch (error) {
    console.error("Error in batch update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate limit
    if (limit > 50) {
      return NextResponse.json(
        { error: "Limit cannot exceed 50 songs per request" },
        { status: 400 }
      );
    }

    const result = await batchUpdateSongsSpotifyData(limit);

    return NextResponse.json({
      message: `Batch update completed: ${result.processed} songs updated, ${result.errors} errors`,
      ...result
    });

  } catch (error) {
    console.error("Error in batch update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}