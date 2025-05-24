import { NextRequest, NextResponse } from "next/server";
import { 
  initializeSystemStations, 
  refreshSystemStationsIfNeeded,
  SYSTEM_STATIONS 
} from "@/lib/stations/systemStations";
import { prisma } from "@/lib/prisma";

// GET: Fetch all system stations
export async function GET() {
  try {
    const systemStations = await prisma.station.findMany({
      where: { isSystem: true },
      include: {
        _count: {
          select: {
            members: true,
            tracks: true,
          },
        },
        tracks: {
          orderBy: {
            addedAt: "desc",
          },
          take: 5, // Get latest 5 tracks for preview
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      stations: systemStations,
      configs: SYSTEM_STATIONS,
    });
  } catch (error) {
    console.error("Error fetching system stations:", error);
    return NextResponse.json(
      { error: "Failed to fetch system stations" },
      { status: 500 }
    );
  }
}

// POST: Initialize system stations or refresh them
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'initialize':
        const initResults = await initializeSystemStations();
        return NextResponse.json({
          message: "System stations initialized",
          results: initResults,
        });

      case 'refresh':
        const refreshResults = await refreshSystemStationsIfNeeded();
        return NextResponse.json({
          message: "System stations refreshed",
          refreshed: refreshResults.length,
          results: refreshResults,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'initialize' or 'refresh'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing system stations:", error);
    return NextResponse.json(
      { error: "Failed to manage system stations" },
      { status: 500 }
    );
  }
}