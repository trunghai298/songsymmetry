import { prisma } from '@/lib/prisma';
import { getServerSpotifyClient } from './spotify-sdk/ServerInstance';

export interface SpotifyTrackResolutionResult {
  songId: number;
  spotifyId: string | null;
  success: boolean;
  error?: string;
  imageUrl?: string;
}

/**
 * Resolve Spotify ID for a single song
 */
export async function resolveSpotifyIdForSong(
  songId: number, 
  name: string, 
  artist: string
): Promise<SpotifyTrackResolutionResult> {
  try {
    // Check if we already have a Spotify ID
    const existingSong = await prisma.mostStreamedSongs.findUnique({
      where: { id: songId },
      select: { spotifyId: true, thumbnail: true }
    });

    if (existingSong?.spotifyId) {
      return {
        songId,
        spotifyId: existingSong.spotifyId,
        success: true,
        imageUrl: existingSong.thumbnail || undefined
      };
    }

    // Search for the track on Spotify
    const spotify = getServerSpotifyClient();
    const searchQuery = `track:"${name}" artist:"${artist}"`;
    const searchResults = await spotify.search(searchQuery, ['track'], undefined, 5);

    if (searchResults.tracks.items.length === 0) {
      // Try a looser search
      const looserQuery = `${name} ${artist}`;
      const looserResults = await spotify.search(looserQuery, ['track'], undefined, 3);
      
      if (looserResults.tracks.items.length === 0) {
        return {
          songId,
          spotifyId: null,
          success: false,
          error: 'No Spotify track found'
        };
      }
      
      searchResults.tracks.items = looserResults.tracks.items;
    }

    // Find the best match based on name and artist similarity
    const spotifyTrack = findBestMatch(searchResults.tracks.items, name, artist);
    
    if (!spotifyTrack) {
      return {
        songId,
        spotifyId: null,
        success: false,
        error: 'No good match found'
      };
    }

    const imageUrl = spotifyTrack.album.images[0]?.url || null;

    // Update the database with the found Spotify ID
    await prisma.mostStreamedSongs.update({
      where: { id: songId },
      data: { 
        spotifyId: spotifyTrack.id,
        thumbnail: imageUrl,
        updatedAt: new Date()
      }
    });

    return {
      songId,
      spotifyId: spotifyTrack.id,
      success: true,
      imageUrl: imageUrl || undefined
    };

  } catch (error) {
    console.error(`Error resolving Spotify ID for song ${songId}:`, error);
    return {
      songId,
      spotifyId: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Find the best matching track from Spotify search results
 */
function findBestMatch(tracks: any[], targetName: string, targetArtist: string) {
  if (tracks.length === 0) return null;
  if (tracks.length === 1) return tracks[0];

  // Score each track based on name and artist similarity
  const scoredTracks = tracks.map(track => {
    const nameScore = calculateSimilarity(track.name.toLowerCase(), targetName.toLowerCase());
    const artistScore = Math.max(
      ...track.artists.map((artist: any) => 
        calculateSimilarity(artist.name.toLowerCase(), targetArtist.toLowerCase())
      )
    );
    
    return {
      track,
      score: (nameScore * 0.6) + (artistScore * 0.4) // Prioritize name match
    };
  });

  // Sort by score and return the best match
  scoredTracks.sort((a, b) => b.score - a.score);
  
  // Only return if the match is reasonably good (threshold 0.6)
  return scoredTracks[0].score > 0.6 ? scoredTracks[0].track : null;
}

/**
 * Calculate string similarity (simple Levenshtein-based)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i] + 1,     // deletion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Bulk resolve Spotify IDs for multiple songs
 */
export async function bulkResolveSpotifyIds(
  songs: { id: number; name: string; artist: string }[],
  concurrency: number = 5
): Promise<SpotifyTrackResolutionResult[]> {
  const results: SpotifyTrackResolutionResult[] = [];
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < songs.length; i += concurrency) {
    const batch = songs.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(song => resolveSpotifyIdForSong(song.id, song.name, song.artist))
    );
    
    results.push(...batchResults);
    
    // Small delay between batches to respect rate limits
    if (i + concurrency < songs.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Log progress
    console.log(`Resolved Spotify IDs: ${Math.min(i + concurrency, songs.length)}/${songs.length}`);
  }
  
  return results;
}

/**
 * Update station tracks to use Spotify IDs instead of ChartMasters IDs
 */
export async function updateStationTracksToSpotifyIds(stationId?: string): Promise<{
  updated: number;
  failed: number;
  total: number;
}> {
  try {
    // Get station tracks that need updating (those with track-{id} format)
    const tracksToUpdate = await prisma.stationTrack.findMany({
      where: {
        ...(stationId && { stationId }),
        trackId: { startsWith: 'track-' }
      },
      select: {
        id: true,
        trackId: true,
        name: true,
        artist: true,
        imageUrl: true,
        stationId: true
      }
    });

    if (tracksToUpdate.length === 0) {
      return { updated: 0, failed: 0, total: 0 };
    }

    console.log(`Updating ${tracksToUpdate.length} station tracks to use Spotify IDs...`);

    let updated = 0;
    let failed = 0;

    // Process tracks in batches
    const batchSize = 5;
    for (let i = 0; i < tracksToUpdate.length; i += batchSize) {
      const batch = tracksToUpdate.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (track) => {
        try {
          // Extract song ID from track-{id} format
          const songId = parseInt(track.trackId.replace('track-', ''));
          
          // Resolve Spotify ID for this song
          const result = await resolveSpotifyIdForSong(songId, track.name || '', track.artist || '');
          
          if (result.success && result.spotifyId) {
            // Update the station track with the Spotify ID
            await prisma.stationTrack.update({
              where: { id: track.id },
              data: {
                trackId: result.spotifyId,
                imageUrl: result.imageUrl || track.imageUrl || null
              }
            });
            updated++;
            console.log(`✅ Updated track: ${track.name} -> ${result.spotifyId}`);
          } else {
            failed++;
            console.log(`❌ Failed to resolve: ${track.name} - ${result.error}`);
          }
        } catch (error) {
          failed++;
          console.error(`Error updating track ${track.id}:`, error);
        }
      }));

      // Small delay between batches
      if (i + batchSize < tracksToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return { updated, failed, total: tracksToUpdate.length };

  } catch (error) {
    console.error('Error updating station tracks to Spotify IDs:', error);
    throw error;
  }
}