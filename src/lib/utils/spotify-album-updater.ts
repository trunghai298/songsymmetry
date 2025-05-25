import { PrismaClient } from "@prisma/client";
import { getServerSpotifyClient } from "@/lib/spotify-sdk/ServerInstance";

const prisma = new PrismaClient();

export interface AlbumWithSpotifyData {
  id: number;
  albName: string | null;
  artist: string | null;
  thumbnail: string | null;
  albType: string | null;
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
 * Updates a single album with Spotify data if not already present
 */
export async function updateAlbumSpotifyData(albumId: number): Promise<AlbumWithSpotifyData | null> {
  try {
    const album = await prisma.mostStreamedAlbums.findUnique({
      where: { id: albumId }
    });

    if (!album) {
      return null;
    }

    // If already has Spotify data, return as is
    if (album.spotifyId) {
      return album as AlbumWithSpotifyData;
    }

    // If missing album name or artist, can't search
    if (!album.albName || !album.artist) {
      return album as AlbumWithSpotifyData;
    }

    try {
      const spotifyClient = getServerSpotifyClient();
      const searchQuery = `album:"${album.albName}" artist:"${album.artist}"`;
      const searchResults = await spotifyClient.search(searchQuery, ['album'], 'US', 1);
      
      if (searchResults.albums.items.length > 0) {
        const spotifyAlbum = searchResults.albums.items[0];
        
        // Update the album with Spotify data
        const updatedAlbum = await prisma.mostStreamedAlbums.update({
          where: { id: albumId },
          data: {
            spotifyId: spotifyAlbum.id,
            thumbnail: spotifyAlbum.images[0]?.url || album.thumbnail,
            updatedAt: new Date()
          }
        });

        return updatedAlbum as AlbumWithSpotifyData;
      }
    } catch (spotifyError) {
      console.error(`Spotify search error for album ${albumId}:`, spotifyError);
    }

    return album as AlbumWithSpotifyData;
  } catch (error) {
    console.error(`Error updating album ${albumId} with Spotify data:`, error);
    return null;
  }
}

/**
 * Updates multiple albums with Spotify data in background
 * This should be called asynchronously to avoid blocking the main response
 */
export async function updateAlbumsSpotifyDataBackground(albumIds: number[]): Promise<void> {
  // Run this in background without blocking
  Promise.resolve().then(async () => {
    for (const albumId of albumIds) {
      try {
        await updateAlbumSpotifyData(albumId);
        // Add small delay to avoid hitting Spotify rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Background update failed for album ${albumId}:`, error);
      }
    }
  });
}

/**
 * Batch update albums without Spotify data
 */
export async function batchUpdateAlbumsSpotifyData(limit: number = 10): Promise<{
  processed: number;
  errors: number;
  results: Array<{
    albumId: number;
    albName: string | null;
    artist: string | null;
    spotifyId: string | null;
    updated: boolean;
    error?: string;
  }>;
}> {
  const albumsWithoutSpotify = await prisma.mostStreamedAlbums.findMany({
    where: {
      spotifyId: null,
      albName: { not: null },
      artist: { not: null }
    },
    take: limit,
    orderBy: { streamCount: 'desc' }
  });

  let processed = 0;
  let errors = 0;
  const results = [];

  const spotifyClient = getServerSpotifyClient();

  for (const album of albumsWithoutSpotify) {
    try {
      const searchQuery = `album:"${album.albName}" artist:"${album.artist}"`;
      const searchResults = await spotifyClient.search(searchQuery, ['album'], 'US', 1);
      
      if (searchResults.albums.items.length > 0) {
        const spotifyAlbum = searchResults.albums.items[0];
        
        await prisma.mostStreamedAlbums.update({
          where: { id: album.id },
          data: {
            spotifyId: spotifyAlbum.id,
            thumbnail: spotifyAlbum.images[0]?.url || album.thumbnail,
            updatedAt: new Date()
          }
        });

        results.push({
          albumId: album.id,
          albName: album.albName,
          artist: album.artist,
          spotifyId: spotifyAlbum.id,
          updated: true
        });

        processed++;
      } else {
        results.push({
          albumId: album.id,
          albName: album.albName,
          artist: album.artist,
          spotifyId: null,
          updated: false
        });
      }

      // Add delay to avoid hitting Spotify rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Error processing album ${album.id}:`, error);
      errors++;
      results.push({
        albumId: album.id,
        albName: album.albName,
        artist: album.artist,
        spotifyId: null,
        updated: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return { processed, errors, results };
}