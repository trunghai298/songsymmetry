import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Quick health check with minimal database queries
    const [songCount, albumCount, systemStationCount] = await Promise.all([
      prisma.mostStreamedSongs.count(),
      prisma.mostStreamedAlbums.count(),
      prisma.station.count({ where: { isSystem: true } })
    ]);

    const isHealthy = songCount > 0 && albumCount > 0 && systemStationCount === 4;
    const isEmpty = songCount === 0 && albumCount === 0 && systemStationCount === 0;

    const status = isEmpty ? 'empty' : isHealthy ? 'healthy' : 'partial';

    return NextResponse.json({
      status,
      healthy: isHealthy,
      empty: isEmpty,
      timestamp: new Date().toISOString(),
      counts: {
        songs: songCount,
        albums: albumCount,
        systemStations: systemStationCount
      },
      message: isEmpty 
        ? 'System is empty - run setup to import data'
        : isHealthy 
        ? 'All systems operational'
        : 'System partially configured - some data missing'
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        healthy: false,
        empty: false,
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}