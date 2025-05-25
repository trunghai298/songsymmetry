import { PrismaClient } from "@prisma/client";
import { getServerSpotifyClient } from "@/lib/spotify-sdk/ServerInstance";

const prisma = new PrismaClient();

export interface SongWithSpotifyData {
  id: number;
  name: string | null;
  artist: string | null;
  thumbnail: string | null;
  streamCount: bigint | null;
  dailyStreamCount: bigint | null;
  year: string | null;
  genre: string | null;
  language: string | null;
  spotifyId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Updates a single song with Spotify data if not already present
 */
export async function updateSongSpotifyData(songId: number): Promise<SongWithSpotifyData | null> {
  try {
    const song = await prisma.mostStreamedSongs.findUnique({
      where: { id: songId }
    });

    if (!song) {
      return null;
    }

    // If already has Spotify data, return as is
    if (song.spotifyId) {
      return song as SongWithSpotifyData;
    }

    // If missing name or artist, can't search
    if (!song.name || !song.artist) {
      return song as SongWithSpotifyData;
    }

    try {
      const spotifyClient = getServerSpotifyClient();
      const searchQuery = `track:"${song.name}" artist:"${song.artist}"`;
      const searchResults = await spotifyClient.search(searchQuery, ['track'], 'US', 1);
      
      if (searchResults.tracks.items.length > 0) {
        const spotifyTrack = searchResults.tracks.items[0];
        
        // Update the song with Spotify data
        const updatedSong = await prisma.mostStreamedSongs.update({
          where: { id: songId },
          data: {
            spotifyId: spotifyTrack.id,
            thumbnail: spotifyTrack.album.images[0]?.url || song.thumbnail,
            updatedAt: new Date()
          }
        });

        return updatedSong as SongWithSpotifyData;
      }
    } catch (spotifyError) {
      console.error(`Spotify search error for song ${songId}:`, spotifyError);
    }

    return song as SongWithSpotifyData;
  } catch (error) {
    console.error(`Error updating song ${songId} with Spotify data:`, error);
    return null;
  }
}

/**
 * Updates multiple songs with Spotify data in background
 * This should be called asynchronously to avoid blocking the main response
 */
export async function updateSongsSpotifyDataBackground(songIds: number[]): Promise<void> {
  // Run this in background without blocking
  Promise.resolve().then(async () => {
    for (const songId of songIds) {
      try {
        await updateSongSpotifyData(songId);
        // Add small delay to avoid hitting Spotify rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Background update failed for song ${songId}:`, error);
      }
    }
  });
}

/**
 * Batch update songs without Spotify data
 */
export async function batchUpdateSongsSpotifyData(limit: number = 10): Promise<{
  processed: number;
  errors: number;
  results: Array<{
    songId: number;
    name: string | null;
    artist: string | null;
    spotifyId: string | null;
    updated: boolean;
    error?: string;
  }>;
}> {
  const songsWithoutSpotify = await prisma.mostStreamedSongs.findMany({
    where: {
      spotifyId: null,
      name: { not: null },
      artist: { not: null }
    },
    take: limit,
    orderBy: { streamCount: 'desc' }
  });

  let processed = 0;
  let errors = 0;
  const results = [];

  const spotifyClient = getServerSpotifyClient();

  for (const song of songsWithoutSpotify) {
    try {
      const searchQuery = `track:"${song.name}" artist:"${song.artist}"`;
      const searchResults = await spotifyClient.search(searchQuery, ['track'], 'US', 1);
      
      if (searchResults.tracks.items.length > 0) {
        const spotifyTrack = searchResults.tracks.items[0];
        
        await prisma.mostStreamedSongs.update({
          where: { id: song.id },
          data: {
            spotifyId: spotifyTrack.id,
            thumbnail: spotifyTrack.album.images[0]?.url || song.thumbnail,
            updatedAt: new Date()
          }
        });

        results.push({
          songId: song.id,
          name: song.name,
          artist: song.artist,
          spotifyId: spotifyTrack.id,
          updated: true
        });

        processed++;
      } else {
        results.push({
          songId: song.id,
          name: song.name,
          artist: song.artist,
          spotifyId: null,
          updated: false
        });
      }

      // Add delay to avoid hitting Spotify rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Error processing song ${song.id}:`, error);
      errors++;
      results.push({
        songId: song.id,
        name: song.name,
        artist: song.artist,
        spotifyId: null,
        updated: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return { processed, errors, results };
}