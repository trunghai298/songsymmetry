import { NextRequest, NextResponse } from "next/server";
import { 
  refreshSystemStationTracks,
  getSystemStationTracks,
  SYSTEM_STATIONS 
} from "@/lib/stations/systemStations";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: Get specific system station details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    const station = await prisma.station.findUnique({
      where: { 
        id,
        isSystem: true 
      },
      include: {
        tracks: {
          orderBy: {
            addedAt: "desc",
          },
        },
        _count: {
          select: {
            members: true,
            tracks: true,
          },
        },
      },
    });

    if (!station) {
      return NextResponse.json(
        { error: "System station not found" },
        { status: 404 }
      );
    }

    const config = SYSTEM_STATIONS.find(s => s.id === id);

    return NextResponse.json({
      station,
      config,
    });
  } catch (error) {
    console.error("Error fetching system station:", error);
    return NextResponse.json(
      { error: "Failed to fetch system station" },
      { status: 500 }
    );
  }
}

// POST: Refresh specific system station
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const { action } = await request.json();

    switch (action) {
      case 'refresh':
        const result = await refreshSystemStationTracks(id);
        return NextResponse.json({
          message: "System station refreshed",
          result,
        });

      case 'preview':
        const config = SYSTEM_STATIONS.find(s => s.id === id);
        if (!config) {
          return NextResponse.json(
            { error: "System station configuration not found" },
            { status: 404 }
          );
        }

        const tracks = await getSystemStationTracks(
          config.stationType,
          config.trackLimit
        );
        
        return NextResponse.json({
          tracks,
          config,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'refresh' or 'preview'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing system station:", error);
    return NextResponse.json(
      { error: "Failed to manage system station" },
      { status: 500 }
    );
  }
}