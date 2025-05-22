import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "../../../auth/[...nextauth]/authOptions";
import { getAuthUser, isAuthenticated } from "@/lib/session";
import { get } from "lodash";

// GET: Fetch all members of a station
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;

    const members = await prisma.stationMember.findMany({
      where: { stationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error(`Error fetching members for station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch station members" },
      { status: 500 }
    );
  }
}

// POST: Join a station
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
        { error: "You must be logged in to join a station" },
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

    // Check if the user is already a member
    const existingMembership = await prisma.stationMember.findUnique({
      where: {
        stationId_userId: {
          stationId,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member of this station" },
        { status: 400 }
      );
    }

    // First, ensure the user exists in the database
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

    // Add the user as a member
    const membership = await prisma.stationMember.create({
      data: {
        stationId,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error(`Error joining station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to join station" },
      { status: 500 }
    );
  }
}

// DELETE: Leave a station
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const stationId = params.id;
    const user = getAuthUser(session);

    if (!user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to leave a station" },
        { status: 401 }
      );
    }

    // Check if the user is a member
    const membership = await prisma.stationMember.findUnique({
      where: {
        stationId_userId: {
          stationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this station" },
        { status: 400 }
      );
    }

    // Check if the user is the station owner
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { ownerId: true },
    });

    if (station?.ownerId === user.id) {
      return NextResponse.json(
        {
          error:
            "The station owner cannot leave their own station. Delete the station instead.",
        },
        { status: 400 }
      );
    }

    // Remove the membership
    await prisma.stationMember.delete({
      where: {
        stationId_userId: {
          stationId,
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ message: "You have left the station" });
  } catch (error) {
    console.error(`Error leaving station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to leave station" },
      { status: 500 }
    );
  }
}
