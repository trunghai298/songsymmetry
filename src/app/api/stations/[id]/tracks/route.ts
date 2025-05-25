import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "../../../auth/[...nextauth]/authOptions";
import { getAuthUser } from "@/lib/session";
import { get } from "lodash";

// GET: Fetch all tracks for a station
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;

    const tracks = await prisma.stationTrack.findMany({
      where: { stationId },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        addedAt: "desc",
      },
    });

    return NextResponse.json(tracks);
  } catch (error) {
    console.error(`Error fetching tracks for station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch station tracks" },
      { status: 500 }
    );
  }
}

// POST: Add a track to a station
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const stationId = params.id;
    const user = getAuthUser(session);

    if (!user?.id || !user.name) {
      return NextResponse.json(
        { error: "You must be logged in to add tracks" },
        { status: 401 }
      );
    }

    // Check if the station exists
    const station = await prisma.station.findUnique({
      where: { id: stationId },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    // Ensure the user exists in the database
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        image: user.image,
        spotifyId: get(user, "spotifyId", null),
        spotifyToken: user.spotifyToken,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        spotifyId: get(user, "spotifyId", null),
        spotifyToken: user.spotifyToken,
      },
    });

    // Check if the user is a member of the station
    const isMember = await prisma.stationMember.findUnique({
      where: {
        stationId_userId: {
          stationId,
          userId: user.id,
        },
      },
    });

    if (!isMember) {
      // If not already a member, automatically add them as a member
      await prisma.stationMember.create({
        data: {
          stationId,
          userId: user.id,
        },
      });
    }

    const { trackId, name, artist, imageUrl } = await request.json();

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    // Warn if using ChartMasters ID format instead of Spotify ID
    if (trackId.startsWith('track-')) {
      console.warn(`Warning: Adding track with ChartMasters ID format (${trackId}) instead of Spotify ID. Consider using Spotify IDs for better integration.`);
    }

    // Add the track to the station
    console.log("Creating track with data:", {
      trackId,
      name,
      artist,
      imageUrl,
      stationId,
      addedById: user.id,
    });

    const track = await prisma.stationTrack.create({
      data: {
        trackId,
        name,
        artist,
        imageUrl,
        stationId,
        addedById: user.id,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    console.log("Track created successfully:", track);

    // Return the newly created track
    return NextResponse.json(track, { status: 201 });
  } catch (error) {
    console.error(`Error adding track to station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to add track to station" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a track from the station
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const stationId = params.id;
    const url = new URL(request.url);
    const trackId = url.searchParams.get("trackId");
    const user = getAuthUser(session);

    if (!user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to remove tracks" },
        { status: 401 }
      );
    }

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    // Find the track
    const track = await prisma.stationTrack.findFirst({
      where: {
        id: trackId,
        stationId,
      },
    });

    if (!track) {
      return NextResponse.json(
        { error: "Track not found in this station" },
        { status: 404 }
      );
    }

    // Only the station owner or the person who added the track can remove it
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { ownerId: true },
    });

    if (track.addedById !== user.id && station?.ownerId !== user.id) {
      return NextResponse.json(
        { error: "You are not authorized to remove this track" },
        { status: 403 }
      );
    }

    // Remove the track
    await prisma.stationTrack.delete({
      where: { id: trackId },
    });

    return NextResponse.json({ message: "Track removed from station" });
  } catch (error) {
    console.error(`Error removing track from station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to remove track from station" },
      { status: 500 }
    );
  }
}
