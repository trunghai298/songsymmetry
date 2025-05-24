import { SpotifyApi, SpotifyConfiguration } from "@spotify/web-api-ts-sdk";

let serverSpotifyClient: SpotifyApi | null = null;

/**
 * Get a server-side Spotify client using Client Credentials flow
 * This is used for server-side operations that don't require user authentication
 */
export function getServerSpotifyClient(): SpotifyApi {
  if (!serverSpotifyClient) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Spotify client credentials not configured");
    }

    serverSpotifyClient = SpotifyApi.withClientCredentials(
      clientId,
      clientSecret
    );
  }

  return serverSpotifyClient;
}

/**
 * Search for a track on Spotify using server credentials
 */
export async function searchSpotifyTrack(query: string) {
  try {
    const client = getServerSpotifyClient();
    const results = await client.search(query, ['track'], 'US', 1);
    return results.tracks.items[0] || null;
  } catch (error) {
    console.error('Error searching Spotify track:', error);
    return null;
  }
}