import { MaxInt, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { prisma } from "@/lib/prisma";

/**
 * Fetches tracks from a Spotify playlist and adds them to a station
 * @param spotifyToken The user's Spotify access token
 * @param refreshToken The user's Spotify refresh token
 * @param playlistId The Spotify playlist ID to import
 * @param stationId The station ID to add tracks to
 * @param userId The user ID who is adding the tracks
 * @returns Object with counts of successful and failed tracks
 */
export async function importPlaylistTracksToStation(
  spotifyToken: string,
  refreshToken: string | null,
  playlistId: string,
  stationId: string,
  userId: string
): Promise<{ success: number; failed: number }> {
  console.log(
    `Importing tracks from playlist ${playlistId} to station ${stationId}`
  );

  // Initialize Spotify API client
  const spotifyApi = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID || "",
    {
      access_token: spotifyToken,
      expires_in: 3600,
      token_type: "Bearer",
      refresh_token: refreshToken || "dummy-refresh-token",
    }
  );

  try {
    // Fetch the playlist details
    const playlist = await spotifyApi.playlists.getPlaylist(playlistId);

    // Get tracks from the playlist (handle pagination)
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
        const limit = parseInt(urlParams.get("limit") || "100", 10);

        const moreTracks = await spotifyApi.playlists.getPlaylistItems(
          playlistId,
          undefined,
          String(limit),
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
    } catch (error) {
      console.error("Error while paginating playlist tracks:", error);
      // Continue with tracks already fetched
    }

    // Extract only valid tracks (some might be null)
    const tracks = allTracks
      .map((item) => item.track)
      .filter((track) => track !== null && track.id);

    if (tracks.length === 0) {
      console.log(`No valid tracks found in playlist ${playlistId}`);
      return { success: 0, failed: 0 };
    }

    console.log(
      `Found ${tracks.length} valid tracks in playlist ${playlistId}`
    );

    // Add tracks to the station
    let successCount = 0;
    let failCount = 0;

    // Use a batch operation for better performance
    const createOperations = tracks.map((track) => {
      return prisma.stationTrack
        .create({
          data: {
            trackId: track.id,
            name: track.name,
            artist: track.artists[0]?.name || "Unknown Artist",
            imageUrl: track.album?.images[0]?.url,
            stationId: stationId,
            addedById: userId,
          },
        })
        .then(() => {
          successCount++;
          return true;
        })
        .catch((error) => {
          console.error(`Error adding track ${track.id} to station:`, error);
          failCount++;
          return false;
        });
    });

    // Execute all create operations
    await Promise.allSettled(createOperations);

    console.log(
      `Imported ${successCount} tracks successfully, ${failCount} failed`
    );

    return {
      success: successCount,
      failed: failCount,
    };
  } catch (error) {
    console.error(`Error importing playlist ${playlistId}:`, error);
    throw error;
  }
}
