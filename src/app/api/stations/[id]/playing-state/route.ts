import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "../../../auth/[...nextauth]/authOptions";
import { getAuthUser } from "@/lib/session";

// PATCH: Update station playing state
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const stationId = params.id;
    const user = getAuthUser(session);

    if (!user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to update playing state" },
        { status: 401 }
      );
    }

    // Check if the user is a member of the station or if it's a system station
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { isSystem: true }
    });

    if (!station?.isSystem) {
      const isMember = await prisma.stationMember.findUnique({
        where: {
          stationId_userId: {
            stationId,
            userId: user.id,
          },
        },
      });

      if (!isMember) {
        return NextResponse.json(
          { error: "You must be a member of this station to update playing state" },
          { status: 403 }
        );
      }
    }

    const {
      isPlaying,
      currentTrackId,
      currentSpotifyId,
      playingStartedAt,
    } = await request.json();

    // Update the station's playing state
    const updatedStation = await prisma.station.update({
      where: { id: stationId },
      data: {
        isPlaying: isPlaying ?? false,
        currentTrackId: currentTrackId || null,
        currentSpotifyId: currentSpotifyId || null,
        playingStartedAt: playingStartedAt ? new Date(playingStartedAt) : null,
        playingUserId: isPlaying ? user.id : null,
        lastActivityAt: new Date(),
      },
      include: {
        playingUser: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        tracks: {
          where: currentTrackId ? { id: currentTrackId } : {},
          include: {
            addedBy: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      station: updatedStation,
    });
  } catch (error) {
    console.error(`Error updating playing state for station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to update playing state" },
      { status: 500 }
    );
  }
}

// GET: Get current playing state
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: {
        isPlaying: true,
        currentTrackId: true,
        currentSpotifyId: true,
        playingStartedAt: true,
        lastActivityAt: true,
        playingUser: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        tracks: {
          include: {
            addedBy: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!station) {
      return NextResponse.json(
        { error: "Station not found" },
        { status: 404 }
      );
    }

    // Find the current playing track if there is one
    const currentTrack = station.currentTrackId
      ? station.tracks.find((track: any) => track.id === station.currentTrackId)
      : null;

    return NextResponse.json({
      isPlaying: station.isPlaying,
      currentTrack,
      currentSpotifyId: station.currentSpotifyId,
      playingStartedAt: station.playingStartedAt,
      lastActivityAt: station.lastActivityAt,
      playingUser: station.playingUser,
    });
  } catch (error) {
    console.error(`Error fetching playing state for station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch playing state" },
      { status: 500 }
    );
  }
}