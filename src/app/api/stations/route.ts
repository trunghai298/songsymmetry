import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "../auth/[...nextauth]/authOptions";
import { importPlaylistTracksToStation } from "@/lib/utils/playlist-utils";
import { getAuthUser } from "@/lib/session";
import { get } from "lodash";

// GET: Fetch all public stations (including system stations)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeSystem = searchParams.get('includeSystem') !== 'false'; // Default to true

    const whereClause = includeSystem ? {} : { isSystem: false };

    const stations = await prisma.station.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        playlistId: true,
        isSystem: true,
        stationType: true,
        isPlaying: true,
        currentTrackId: true,
        currentSpotifyId: true,
        playingStartedAt: true,
        lastActivityAt: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
            tracks: true,
          },
        },
        playingUser: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [
        { isSystem: "desc" }, // System stations first
        { createdAt: "desc" },
      ],
    });

    // For each station, get the current playing track or latest track
    const stationsWithTracks = await Promise.all(
      stations.map(async (station) => {
        let currentTrack = null;
        
        if (station.currentTrackId) {
          // Get the currently playing track
          currentTrack = await prisma.stationTrack.findUnique({
            where: { id: station.currentTrackId },
            select: {
              id: true,
              trackId: true,
              name: true,
              artist: true,
              imageUrl: true,
              addedAt: true,
            }
          });
        }
        
        if (!currentTrack) {
          // Get the most recently added track as fallback
          const recentTrack = await prisma.stationTrack.findFirst({
            where: { stationId: station.id },
            orderBy: { addedAt: "desc" },
            select: {
              id: true,
              trackId: true,
              name: true,
              artist: true,
              imageUrl: true,
              addedAt: true,
            }
          });
          currentTrack = recentTrack;
        }

        return {
          ...station,
          currentTrack,
          tracks: currentTrack ? [currentTrack] : [], // For backward compatibility
        };
      })
    );

    return NextResponse.json(stationsWithTracks);
  } catch (error) {
    console.error("Error fetching stations:", error);
    return NextResponse.json(
      { error: "Failed to fetch stations" },
      { status: 500 }
    );
  }
}

// POST: Create a new station
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Use our utility to get a properly typed user
    const user = getAuthUser(session);
    if (!user?.id || !user.name) {
      return NextResponse.json(
        { error: "You must be logged in to create a station" },
        { status: 401 }
      );
    }

    const { name, description, playlistId, imageUrl } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Station name is required" },
        { status: 400 }
      );
    }

    // First, ensure the user exists in the database
    // Using upsert to create the user if they don't exist or update if they do
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        image: user.image,
        spotifyId: get(user, "spotifyId"),
        spotifyToken: user.spotifyToken,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        spotifyId: get(user, "spotifyId"),
        spotifyToken: user.spotifyToken,
      },
    });

    // Now create the station
    const station = await prisma.station.create({
      data: {
        name,
        description,
        playlistId,
        imageUrl,
        ownerId: user.id,
        // Automatically add the creator as a member
        members: {
          create: {
            userId: user.id,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // If a playlist ID was provided, import its tracks
    let importResults = null;
    if (playlistId && user.spotifyToken) {
      try {
        console.log(
          `Importing tracks from playlist ${playlistId} for new station ${station.id}`
        );
        importResults = await importPlaylistTracksToStation(
          user.spotifyToken,
          user.refresh_token || null,
          playlistId,
          station.id,
          user.id
        );
        console.log(
          `Successfully imported ${importResults.success} tracks to station ${station.id}`
        );

        // Update station with track count if tracks were imported
        if (importResults.success > 0) {
          await prisma.station.update({
            where: { id: station.id },
            data: {
              // Any additional updates if needed
            },
          });
        }
      } catch (importError) {
        console.error(
          `Error importing playlist tracks when creating station:`,
          importError
        );
        // We don't fail the request if import fails - the station is still created
      }
    }

    // Add import results to the response if available
    const response = {
      ...station,
      importResults: importResults
        ? {
            success: importResults.success,
            failed: importResults.failed,
            imported: importResults.success > 0,
          }
        : null,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating station:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create station";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
