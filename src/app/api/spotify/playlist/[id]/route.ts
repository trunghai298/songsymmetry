import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "../../../auth/[...nextauth]/authOptions";
import { MaxInt, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { getAuthUser } from "@/lib/session";

/**
 * GET /api/spotify/playlist/[id]
 * Fetches a Spotify playlist by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`Fetching Spotify playlist with ID: ${params.id}`);
  try {
    const session = await getServerSession(authOptions);
    const user = getAuthUser(session);

    if (!user?.spotifyToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const playlistId = params.id;
    if (!playlistId) {
      return NextResponse.json(
        { error: "Playlist ID is required" },
        { status: 400 }
      );
    }

    // Initialize Spotify API client with user's token
    const spotifyApi = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || "",
      {
        access_token: user.spotifyToken,
        expires_in: 3600,
        token_type: "Bearer",
        refresh_token: user.refresh_token || "dummy-refresh-token",
      }
    );

    // Fetch the playlist details
    const playlist = await spotifyApi.playlists.getPlaylist(playlistId);

    // Fetch all tracks from the playlist (handling pagination)
    let allTracks = [...playlist.tracks.items];
    let nextUrl = playlist.tracks.next;
    let paginationCount = 0;
    const MAX_PAGINATION = 5; // Limit to prevent excessive API calls

    try {
      while (nextUrl && paginationCount < MAX_PAGINATION) {
        console.log(
          `Fetching additional tracks page ${
            paginationCount + 1
          } for playlist ${playlistId}`
        );
        paginationCount++;

        // Extract offset from the next URL
        const urlParams = new URL(nextUrl).searchParams;
        const offset = parseInt(
          urlParams.get("offset") || "0",
          10
        ) as MaxInt<50>;
        const limit = String(parseInt(urlParams.get("limit") || "100", 10));

        const moreTracks = await spotifyApi.playlists.getPlaylistItems(
          playlistId,
          undefined,
          limit,
          offset
        );

        if (moreTracks.items && moreTracks.items.length > 0) {
          allTracks = [...allTracks, ...moreTracks.items];
          console.log(
            `Added ${moreTracks.items.length} more tracks (total: ${allTracks.length})`
          );
        }

        nextUrl = moreTracks.next;
      }

      if (nextUrl && paginationCount >= MAX_PAGINATION) {
        console.warn(
          `Reached maximum pagination limit (${MAX_PAGINATION}) for playlist ${playlistId}`
        );
      }
    } catch (error) {
      console.error("Error while paginating playlist tracks:", error);
      // Continue with the tracks we've already fetched
    }

    // Create a response with playlist details and all tracks
    const response = {
      ...playlist,
      tracks: {
        ...playlist.tracks,
        items: allTracks,
      },
    };

    console.log(
      `Successfully fetched playlist ${playlistId} with ${allTracks.length} tracks`
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching Spotify playlist:", error);

    // Return a more specific error message when possible
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch Spotify playlist";
    const status = errorMessage.includes("not found") ? 404 : 500;

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
