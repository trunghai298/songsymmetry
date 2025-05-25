import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/api/auth/[...nextauth]/authOptions";
import { spotifyTrackService } from "@/lib/spotify/trackService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ tracks: [] });
    }

    try {
      // Search for tracks using our Spotify service
      const tracks = await spotifyTrackService.searchTracks(query.trim(), 5);
      
      // Return simplified track data for suggestions
      const suggestions = tracks.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        image: track.album.images[2]?.url || track.album.images[0]?.url,
        year: new Date(track.album.release_date).getFullYear(),
        popularity: track.popularity,
        duration_ms: track.duration_ms,
        explicit: track.explicit
      }));

      return NextResponse.json({ tracks: suggestions });
    } catch (spotifyError) {
      console.error("Spotify search error:", spotifyError);
      return NextResponse.json({ tracks: [] });
    }
  } catch (error) {
    console.error("Error in search suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}