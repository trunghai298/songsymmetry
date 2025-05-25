import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get counts for all main data types
    const [
      songCount,
      albumCount,
      stationCount,
      systemStationCount,
      stationTrackCount,
      userCount
    ] = await Promise.all([
      prisma.mostStreamedSongs.count(),
      prisma.mostStreamedAlbums.count(),
      prisma.station.count(),
      prisma.station.count({ where: { isSystem: true } }),
      prisma.stationTrack.count(),
      prisma.user.count()
    ]);

    // Get system stations details
    const systemStations = await prisma.station.findMany({
      where: { isSystem: true },
      select: {
        id: true,
        name: true,
        stationType: true,
        updatedAt: true,
        _count: {
          select: {
            tracks: true,
            members: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Get some sample data statistics
    const [topSongs, topAlbums] = await Promise.all([
      prisma.mostStreamedSongs.findMany({
        take: 5,
        orderBy: { streamCount: 'desc' },
        select: {
          name: true,
          artist: true,
          streamCount: true,
          year: true,
          language: true
        }
      }),
      prisma.mostStreamedAlbums.findMany({
        take: 5,
        orderBy: { streamCount: 'desc' },
        select: {
          albName: true,
          artist: true,
          streamCount: true,
          year: true
        }
      })
    ]);

    // Get language distribution for songs
    const languageStats = await prisma.mostStreamedSongs.groupBy({
      by: ['language'],
      _count: {
        language: true
      },
      orderBy: {
        _count: {
          language: 'desc'
        }
      },
      take: 10
    });

    // Determine system health status
    const isHealthy = songCount > 0 && albumCount > 0 && systemStationCount === 4;
    const isEmpty = songCount === 0 && albumCount === 0 && stationCount === 0;

    const status = {
      healthy: isHealthy,
      empty: isEmpty,
      timestamp: new Date().toISOString(),
      counts: {
        songs: songCount,
        albums: albumCount,
        stations: stationCount,
        systemStations: systemStationCount,
        stationTracks: stationTrackCount,
        users: userCount
      },
      systemStations: systemStations.map(station => ({
        id: station.id,
        name: station.name,
        type: station.stationType,
        tracks: station._count.tracks,
        members: station._count.members,
        lastUpdated: station.updatedAt.toISOString()
      })),
      sampleData: {
        topSongs: topSongs.map(song => ({
          name: song.name,
          artist: song.artist,
          streams: Number(song.streamCount || 0),
          year: song.year,
          language: song.language
        })),
        topAlbums: topAlbums.map(album => ({
          name: album.albName,
          artist: album.artist,
          streams: Number(album.streamCount || 0),
          year: album.year
        })),
        languageDistribution: languageStats.map(stat => ({
          language: stat.language || 'Unknown',
          count: stat._count.language
        }))
      }
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Error checking system status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check system status',
        details: error instanceof Error ? error.message : 'Unknown error',
        healthy: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}