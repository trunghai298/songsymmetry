import { prisma } from "@/lib/prisma";
import { getMostStreamedSongs } from "@/app/explore/actions";
import { updateStationImageFromSpotify, getSystemStationFallbackImage } from "./stationImageService";
import { getServerSpotifyClient } from "../spotify-sdk/ServerInstance";

export type SystemStationType = 'all-time' | 'kpop' | 'us-uk' | 'random';

export interface SystemStationConfig {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  stationType: SystemStationType;
  trackLimit: number;
  refreshIntervalHours: number;
}

// Configuration for each system station type
export const SYSTEM_STATIONS: SystemStationConfig[] = [
  {
    id: 'system-all-time',
    name: '🎵 All Time Legends',
    description: 'The most streamed songs of all time across all genres and eras',
    imageUrl: '', // Will be dynamically set from Spotify
    stationType: 'all-time',
    trackLimit: 100,
    refreshIntervalHours: 24,
  },
  {
    id: 'system-kpop',
    name: '🌟 K-Pop Hits',
    description: 'The biggest K-Pop tracks dominating the charts worldwide',
    imageUrl: '', // Will be dynamically set from Spotify
    stationType: 'kpop',
    trackLimit: 50,
    refreshIntervalHours: 12,
  },
  {
    id: 'system-us-uk',
    name: '🇺🇸 US/UK Chart Toppers',
    description: 'The hottest tracks from the US and UK music scenes',
    imageUrl: '', // Will be dynamically set from Spotify
    stationType: 'us-uk',
    trackLimit: 75,
    refreshIntervalHours: 6,
  },
  {
    id: 'system-random',
    name: '🎲 Discovery Mix',
    description: 'A randomized selection of great tracks for music discovery',
    imageUrl: '', // Will be dynamically set from Spotify
    stationType: 'random',
    trackLimit: 30,
    refreshIntervalHours: 1,
  },
];

/**
 * Get tracks for All Time station (highest stream counts across all genres)
 */
export async function getAllTimeStationTracks(limit: number = 100) {
  const songs = await getMostStreamedSongs({
    limit,
    offset: 0,
  });
  
  return songs.map(song => ({
    trackId: `track-${song.id}`, // We'll need to map to Spotify track IDs
    name: song.name,
    artist: song.artist,
    imageUrl: song.thumbnail,
    streamCount: song.streamCount,
    metadata: {
      year: song.year,
      genre: song.genre,
      language: song.language,
    },
  }));
}

/**
 * Get tracks for K-Pop station (filtered by Korean language and K-Pop genres)
 */
export async function getKPopStationTracks(limit: number = 50) {
  // Get Korean language songs directly
  const songs = await getMostStreamedSongs({
    limit: limit * 3, // Get more to ensure we have enough
    offset: 0,
    language: ['Korean'], // Use exact case as stored in DB
  });
  
  // Also get songs with K-Pop genre
  const kpopSongs = await getMostStreamedSongs({
    limit: limit * 3,
    offset: 0,
    genre: ['K-Pop'], // Use exact case as stored in DB
  });
  
  // Combine and deduplicate
  const allKpopSongs = [...songs, ...kpopSongs];
  const uniqueSongs = allKpopSongs.filter((song, index, self) => 
    index === self.findIndex(s => s.id === song.id)
  );
  
  // Sort by stream count and take the limit
  const topKpopSongs = uniqueSongs
    .sort((a, b) => Number(b.streamCount || 0) - Number(a.streamCount || 0))
    .slice(0, limit);
  
  return topKpopSongs.map(song => ({
    trackId: `track-${song.id}`,
    name: song.name,
    artist: song.artist,
    imageUrl: song.thumbnail,
    streamCount: song.streamCount,
    metadata: {
      year: song.year,
      genre: song.genre,
      language: song.language,
    },
  }));
}

/**
 * Get tracks for US/UK station (filtered by English language and popular US/UK artists)
 */
export async function getUSUKStationTracks(limit: number = 75) {
  // Get English language songs directly
  const songs = await getMostStreamedSongs({
    limit: limit * 2,
    offset: 0,
    language: ['English'], // Use exact case as stored in DB
  });
  
  // Filter out obvious non-US/UK genres but be less restrictive
  const usukSongs = songs.filter(song => {
    const genre = song.genre?.toLowerCase() || '';
    
    // Exclude Latin/Spanish genres but keep most English content
    return !/(reggaeton|bachata|cumbia|samba|salsa)/i.test(genre);
  }).slice(0, limit);
  
  return usukSongs.map(song => ({
    trackId: `track-${song.id}`,
    name: song.name,
    artist: song.artist,
    imageUrl: song.thumbnail,
    streamCount: song.streamCount,
    metadata: {
      year: song.year,
      genre: song.genre,
      language: song.language,
    },
  }));
}

/**
 * Get tracks for Random station (random selection with variety)
 */
export async function getRandomStationTracks(limit: number = 30) {
  // Get a larger pool of songs across different criteria
  const [recentSongs, classicSongs, foreignSongs] = await Promise.all([
    getMostStreamedSongs({ limit: 20, year: '2023' }),
    getMostStreamedSongs({ limit: 20, year: '2010' }),
    getMostStreamedSongs({ limit: 20, language: ['spanish', 'french', 'portuguese'] }),
  ]);
  
  // Combine and shuffle
  const allSongs = [...recentSongs, ...classicSongs, ...foreignSongs];
  const shuffled = allSongs.sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, limit).map(song => ({
    trackId: `track-${song.id}`,
    name: song.name,
    artist: song.artist,
    imageUrl: song.thumbnail,
    streamCount: song.streamCount,
    metadata: {
      year: song.year,
      genre: song.genre,
      language: song.language,
    },
  }));
}

/**
 * Enrich track with Spotify data by looking up or searching for spotifyId
 */
async function enrichTrackWithSpotifyData(track: any) {
  try {
    // Extract song ID from trackId (remove "track-" prefix)
    const songId = track.trackId.replace('track-', '');
    
    // First check if we already have spotifyId in the database
    const existingSong = await prisma.mostStreamedSongs.findUnique({
      where: { id: parseInt(songId) },
      select: { spotifyId: true, name: true, artist: true }
    });
    
    if (existingSong?.spotifyId) {
      // Use existing spotifyId
      return {
        ...track,
        trackId: existingSong.spotifyId, // Use real Spotify ID instead of ChartMasters ID
        hasSpotifyId: true
      };
    }
    
    // If no spotifyId, try to search for it on Spotify
    if (track.name && track.artist) {
      try {
        const spotify = getServerSpotifyClient();
        const searchQuery = `track:"${track.name}" artist:"${track.artist}"`;
        const searchResults = await spotify.search(searchQuery, ['track'], undefined, 1);
        
        if (searchResults.tracks.items.length > 0) {
          const spotifyTrack = searchResults.tracks.items[0];
          
          // Update the database with the found spotifyId
          await prisma.mostStreamedSongs.update({
            where: { id: parseInt(songId) },
            data: { 
              spotifyId: spotifyTrack.id,
              thumbnail: spotifyTrack.album.images[0]?.url || null
            }
          });
          
          console.log(`Found and cached Spotify ID for song ${songId}: ${spotifyTrack.id}`);
          
          return {
            ...track,
            trackId: spotifyTrack.id, // Use real Spotify ID
            imageUrl: spotifyTrack.album.images[0]?.url || track.imageUrl,
            hasSpotifyId: true
          };
        }
      } catch (error) {
        console.warn(`Failed to search Spotify for track ${songId}:`, error);
      }
    }
    
    // Return original track if no Spotify data found
    return {
      ...track,
      hasSpotifyId: false
    };
  } catch (error) {
    console.error(`Error enriching track ${track.trackId}:`, error);
    return {
      ...track,
      hasSpotifyId: false
    };
  }
}

/**
 * Get tracks for a specific system station type
 */
export async function getSystemStationTracks(stationType: SystemStationType, limit?: number) {
  switch (stationType) {
    case 'all-time':
      return getAllTimeStationTracks(limit);
    case 'kpop':
      return getKPopStationTracks(limit);
    case 'us-uk':
      return getUSUKStationTracks(limit);
    case 'random':
      return getRandomStationTracks(limit);
    default:
      throw new Error(`Unknown station type: ${stationType}`);
  }
}

/**
 * Get enriched tracks for a specific system station type with Spotify data
 */
export async function getEnrichedSystemStationTracks(stationType: SystemStationType, limit?: number) {
  const tracks = await getSystemStationTracks(stationType, limit);
  
  // Enrich tracks with Spotify data (limit concurrency to avoid rate limits)
  const enrichedTracks = [];
  const batchSize = 5; // Process 5 tracks at a time
  
  for (let i = 0; i < tracks.length; i += batchSize) {
    const batch = tracks.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map(track => enrichTrackWithSpotifyData(track))
    );
    enrichedTracks.push(...enrichedBatch);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < tracks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return enrichedTracks;
}

/**
 * Enrich existing system station tracks with Spotify data
 */
export async function enrichSystemStationTracksInPlace(stationId: string) {
  const station = await prisma.station.findUnique({
    where: { id: stationId, isSystem: true },
    include: { tracks: true }
  });

  if (!station) {
    throw new Error('System station not found');
  }

  console.log(`Enriching ${station.tracks.length} tracks for station ${stationId} with Spotify data...`);
  
  let enrichedCount = 0;
  const batchSize = 5;
  
  for (let i = 0; i < station.tracks.length; i += batchSize) {
    const batch = station.tracks.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (track) => {
      try {
        // Skip if already has a real Spotify ID (not starting with "track-")
        if (!track.trackId.startsWith('track-')) {
          return;
        }
        
        const songId = track.trackId.replace('track-', '');
        
        // Check if we already have spotifyId in the database
        const existingSong = await prisma.mostStreamedSongs.findUnique({
          where: { id: parseInt(songId) },
          select: { spotifyId: true, thumbnail: true }
        });
        
        if (existingSong?.spotifyId) {
          // Update track with Spotify ID
          await prisma.stationTrack.update({
            where: { id: track.id },
            data: { 
              trackId: existingSong.spotifyId,
              imageUrl: existingSong.thumbnail || track.imageUrl
            }
          });
          enrichedCount++;
          return;
        }
        
        // If no spotifyId, try to search for it
        if (track.name && track.artist) {
          try {
            const spotify = getServerSpotifyClient();
            const searchQuery = `track:"${track.name}" artist:"${track.artist}"`;
            const searchResults = await spotify.search(searchQuery, ['track'], undefined, 1);
            
            if (searchResults.tracks.items.length > 0) {
              const spotifyTrack = searchResults.tracks.items[0];
              
              // Update database with found spotifyId
              await prisma.mostStreamedSongs.update({
                where: { id: parseInt(songId) },
                data: { 
                  spotifyId: spotifyTrack.id,
                  thumbnail: spotifyTrack.album.images[0]?.url || null
                }
              });
              
              // Update station track with Spotify ID
              await prisma.stationTrack.update({
                where: { id: track.id },
                data: { 
                  trackId: spotifyTrack.id,
                  imageUrl: spotifyTrack.album.images[0]?.url || track.imageUrl
                }
              });
              
              enrichedCount++;
              console.log(`Enriched track ${track.name} with Spotify ID: ${spotifyTrack.id}`);
            }
          } catch (error) {
            console.warn(`Failed to search Spotify for track ${track.name}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error enriching track ${track.id}:`, error);
      }
    }));
    
    // Small delay between batches
    if (i + batchSize < station.tracks.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`Enriched ${enrichedCount} tracks for station ${stationId}`);
  return { enrichedCount, totalTracks: station.tracks.length };
}

/**
 * Create or update a system station
 */
export async function createOrUpdateSystemStation(config: SystemStationConfig) {
  // Ensure system user exists
  await prisma.user.upsert({
    where: { id: 'system' },
    update: {},
    create: {
      id: 'system',
      name: 'SongSymmetry System',
      email: 'system@songsymmetry.com',
    },
  });

  // Create or update the station
  const fallbackImageUrl = getSystemStationFallbackImage(config.stationType);
  
  const station = await prisma.station.upsert({
    where: { id: config.id },
    update: {
      name: config.name,
      description: config.description,
      updatedAt: new Date(),
    },
    create: {
      id: config.id,
      name: config.name,
      description: config.description,
      imageUrl: fallbackImageUrl, // Use fallback initially
      isSystem: true,
      stationType: config.stationType,
      ownerId: 'system',
    },
    include: {
      _count: {
        select: {
          tracks: true,
          members: true,
        },
      },
    },
  });

  return station;
}

/**
 * Refresh tracks for a system station
 */
export async function refreshSystemStationTracks(stationId: string) {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: { tracks: true },
  });

  if (!station || !station.isSystem || !station.stationType) {
    throw new Error('Station is not a system station');
  }

  const config = SYSTEM_STATIONS.find(s => s.id === stationId);
  if (!config) {
    throw new Error('System station configuration not found');
  }

  // Get new tracks with Spotify enrichment
  console.log(`Refreshing system station ${stationId} with Spotify enrichment...`);
  const newTracks = await getEnrichedSystemStationTracks(
    station.stationType as SystemStationType,
    config.trackLimit
  );

  // Remove old tracks
  await prisma.stationTrack.deleteMany({
    where: { stationId: station.id },
  });

  // Add new tracks
  const tracksToAdd = newTracks.map(track => ({
    stationId: station.id,
    trackId: track.trackId,
    name: track.name,
    artist: track.artist,
    imageUrl: track.imageUrl,
    addedById: 'system',
  }));

  await prisma.stationTrack.createMany({
    data: tracksToAdd,
  });

  // Update station timestamp
  await prisma.station.update({
    where: { id: station.id },
    data: { updatedAt: new Date() },
  });

  // Update station image from Spotify (async, don't wait for it)
  updateStationImageFromSpotify(station.id).catch(error => {
    console.error(`Failed to update image for station ${station.id}:`, error);
  });

  return {
    stationId: station.id,
    tracksAdded: tracksToAdd.length,
    tracksRemoved: station.tracks.length,
  };
}

/**
 * Initialize all system stations
 */
export async function initializeSystemStations() {
  const results = [];
  
  for (const config of SYSTEM_STATIONS) {
    try {
      const station = await createOrUpdateSystemStation(config);
      const refreshResult = await refreshSystemStationTracks(config.id);
      results.push({
        station,
        refresh: refreshResult,
      });
    } catch (error) {
      console.error(`Error initializing system station ${config.id}:`, error);
      results.push({
        station: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Check if system stations need refresh and update them
 */
export async function refreshSystemStationsIfNeeded() {
  const systemStations = await prisma.station.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      stationType: true,
      updatedAt: true,
    },
  });

  const refreshPromises = systemStations.map(async (station) => {
    const config = SYSTEM_STATIONS.find(s => s.id === station.id);
    if (!config) return null;

    const hoursSinceUpdate = 
      (Date.now() - station.updatedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate >= config.refreshIntervalHours) {
      return refreshSystemStationTracks(station.id);
    }
    
    return null;
  });

  const results = await Promise.all(refreshPromises);
  return results.filter(result => result !== null);
}