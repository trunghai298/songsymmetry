import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { resolveSpotifyIdForSong } from '@/lib/spotify-track-resolver';

const execAsync = promisify(exec);

interface SetupOptions {
  songs?: boolean;
  albums?: boolean;
  stations?: boolean;
  force?: boolean; // Force reimport even if data exists
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SetupOptions;
    const { songs = true, albums = true, stations = true, force = false } = body;

    const results: any = {
      timestamp: new Date().toISOString(),
      operations: [],
      success: true,
      errors: []
    };

    // Check current state
    const [songCount, albumCount, stationCount] = await Promise.all([
      prisma.mostStreamedSongs.count(),
      prisma.mostStreamedAlbums.count(),
      prisma.station.count({ where: { isSystem: true } })
    ]);

    const projectRoot = path.join(process.cwd());

    // Import Songs
    if (songs && (force || songCount === 0)) {
      try {
        results.operations.push({ type: 'songs', status: 'starting' });
        
        const { stdout, stderr } = await execAsync(
          'node src/scripts/import-all-songs.js',
          { cwd: projectRoot, timeout: 300000 }
        );
        
        const newSongCount = await prisma.mostStreamedSongs.count();
        results.operations.push({
          type: 'songs',
          status: 'completed',
          before: songCount,
          after: newSongCount,
          imported: newSongCount - songCount
        });
      } catch (error) {
        results.success = false;
        results.errors.push({
          type: 'songs',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.operations.push({ type: 'songs', status: 'failed' });
      }
    } else if (songs && !force && songCount > 0) {
      results.operations.push({
        type: 'songs',
        status: 'skipped',
        reason: `${songCount} songs already exist. Use force=true to reimport.`
      });
    }

    // Import Albums
    if (albums && (force || albumCount === 0)) {
      try {
        results.operations.push({ type: 'albums', status: 'starting' });
        
        const { stdout, stderr } = await execAsync(
          'node src/scripts/import-albums-data.js',
          { cwd: projectRoot, timeout: 300000 }
        );
        
        const newAlbumCount = await prisma.mostStreamedAlbums.count();
        results.operations.push({
          type: 'albums',
          status: 'completed',
          before: albumCount,
          after: newAlbumCount,
          imported: newAlbumCount - albumCount
        });
      } catch (error) {
        results.success = false;
        results.errors.push({
          type: 'albums',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.operations.push({ type: 'albums', status: 'failed' });
      }
    } else if (albums && !force && albumCount > 0) {
      results.operations.push({
        type: 'albums',
        status: 'skipped',
        reason: `${albumCount} albums already exist. Use force=true to reimport.`
      });
    }

    // Setup Stations
    if (stations && (force || stationCount === 0)) {
      try {
        results.operations.push({ type: 'stations', status: 'starting' });
        
        // Only setup stations if we have songs data
        const currentSongCount = await prisma.mostStreamedSongs.count();
        if (currentSongCount === 0) {
          throw new Error('Cannot setup stations without songs data. Import songs first.');
        }

        const stationResult = await setupSystemStations();
        
        const newStationCount = await prisma.station.count({ where: { isSystem: true } });
        const totalTracks = await prisma.stationTrack.count();
        
        results.operations.push({
          type: 'stations',
          status: 'completed',
          before: stationCount,
          after: newStationCount,
          totalTracks: totalTracks
        });
      } catch (error) {
        results.success = false;
        results.errors.push({
          type: 'stations',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.operations.push({ type: 'stations', status: 'failed' });
      }
    } else if (stations && !force && stationCount > 0) {
      results.operations.push({
        type: 'stations',
        status: 'skipped',
        reason: `${stationCount} system stations already exist. Use force=true to recreate.`
      });
    }

    // Final status check
    const finalCounts = await Promise.all([
      prisma.mostStreamedSongs.count(),
      prisma.mostStreamedAlbums.count(),
      prisma.station.count({ where: { isSystem: true } }),
      prisma.stationTrack.count()
    ]);

    results.finalState = {
      songs: finalCounts[0],
      albums: finalCounts[1],
      systemStations: finalCounts[2],
      stationTracks: finalCounts[3],
      healthy: finalCounts[0] > 0 && finalCounts[1] > 0 && finalCounts[2] === 4
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in system setup:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'System setup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function setupSystemStations() {
  const SYSTEM_STATIONS = [
    {
      id: 'system-all-time',
      name: '🎵 All Time Legends',
      description: 'The most streamed songs of all time across all genres and eras',
      stationType: 'all-time',
      trackLimit: 100,
    },
    {
      id: 'system-kpop',
      name: '🌟 K-Pop Hits',
      description: 'The biggest K-Pop tracks dominating the charts worldwide',
      stationType: 'kpop',
      trackLimit: 50,
    },
    {
      id: 'system-us-uk',
      name: '🇺🇸 US/UK Chart Toppers',
      description: 'The hottest tracks from the US and UK music scenes',
      stationType: 'us-uk',
      trackLimit: 75,
    },
    {
      id: 'system-random',
      name: '🎲 Discovery Mix',
      description: 'A randomized selection of great tracks for music discovery',
      stationType: 'random',
      trackLimit: 30,
    },
  ];

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

  for (const config of SYSTEM_STATIONS) {
    // Create or update the station
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
        imageUrl: '',
        isSystem: true,
        stationType: config.stationType,
        ownerId: 'system',
      },
    });

    // Get tracks for this station type and resolve their Spotify IDs
    let selectedSongs: any[] = [];
    
    if (config.stationType === 'all-time') {
      selectedSongs = await prisma.mostStreamedSongs.findMany({
        take: config.trackLimit,
        orderBy: { streamCount: 'desc' },
      });
    } else if (config.stationType === 'kpop') {
      selectedSongs = await prisma.mostStreamedSongs.findMany({
        where: {
          OR: [
            { language: 'Korean' },
            { genre: 'K-Pop' },
          ],
        },
        take: config.trackLimit,
        orderBy: { streamCount: 'desc' },
      });
    } else if (config.stationType === 'us-uk') {
      selectedSongs = await prisma.mostStreamedSongs.findMany({
        where: {
          language: 'English',
          NOT: {
            genre: {
              in: ['Reggaeton', 'Bachata', 'Cumbia', 'Samba', 'Salsa'],
            },
          },
        },
        take: config.trackLimit,
        orderBy: { streamCount: 'desc' },
      });
    } else if (config.stationType === 'random') {
      const songs = await prisma.mostStreamedSongs.findMany({
        take: 100,
        orderBy: { streamCount: 'desc' },
      });
      // Shuffle and take limit
      selectedSongs = songs.sort(() => Math.random() - 0.5).slice(0, config.trackLimit);
    }

    // Resolve Spotify IDs for tracks and build track objects
    const tracks: any[] = [];
    console.log(`Resolving Spotify IDs for ${selectedSongs.length} tracks in station ${config.name}...`);
    
    for (const song of selectedSongs) {
      try {
        // Try to get/resolve Spotify ID for this song
        const spotifyResult = await resolveSpotifyIdForSong(song.id, song.name, song.artist);
        
        if (spotifyResult.success && spotifyResult.spotifyId) {
          tracks.push({
            stationId: station.id,
            trackId: spotifyResult.spotifyId, // Use Spotify ID directly
            name: song.name,
            artist: song.artist,
            imageUrl: spotifyResult.imageUrl || song.thumbnail,
            addedById: 'system',
          });
        } else {
          // Fallback to ChartMasters ID if Spotify resolution fails
          console.warn(`Failed to resolve Spotify ID for ${song.name} by ${song.artist}, using fallback ID`);
          tracks.push({
            stationId: station.id,
            trackId: `track-${song.id}`, // Fallback to ChartMasters format
            name: song.name,
            artist: song.artist,
            imageUrl: song.thumbnail,
            addedById: 'system',
          });
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing song ${song.id}:`, error);
        // Add track with fallback ID on error
        tracks.push({
          stationId: station.id,
          trackId: `track-${song.id}`,
          name: song.name,
          artist: song.artist,
          imageUrl: song.thumbnail,
          addedById: 'system',
        });
      }
    }

    // Remove old tracks
    await prisma.stationTrack.deleteMany({
      where: { stationId: station.id },
    });

    // Add new tracks
    if (tracks.length > 0) {
      await prisma.stationTrack.createMany({
        data: tracks,
      });
    }
  }
}

export async function GET(request: NextRequest) {
  // Return setup options and current state
  try {
    const [songCount, albumCount, stationCount] = await Promise.all([
      prisma.mostStreamedSongs.count(),
      prisma.mostStreamedAlbums.count(),
      prisma.station.count({ where: { isSystem: true } })
    ]);

    return NextResponse.json({
      available: true,
      description: 'System setup API - Import songs, albums, and create system stations',
      currentState: {
        songs: songCount,
        albums: albumCount,
        systemStations: stationCount,
        healthy: songCount > 0 && albumCount > 0 && stationCount === 4
      },
      options: {
        songs: 'Import most streamed songs data',
        albums: 'Import most streamed albums data', 
        stations: 'Create system stations with curated playlists',
        force: 'Force reimport even if data already exists'
      },
      usage: {
        endpoint: 'POST /api/system/setup',
        body: {
          songs: 'boolean (default: true)',
          albums: 'boolean (default: true)',
          stations: 'boolean (default: true)',
          force: 'boolean (default: false)'
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check setup state' },
      { status: 500 }
    );
  }
}