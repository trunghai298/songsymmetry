import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/[...nextauth]/authOptions';
import { getAuthUser } from '@/lib/session';

// GET: Fetch a specific station by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;
    
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        tracks: {
          orderBy: {
            addedAt: 'desc',
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
        { error: 'Station not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(station);
  } catch (error) {
    console.error(`Error fetching station ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch station' },
      { status: 500 }
    );
  }
}

// PATCH: Update a station
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
        { error: 'You must be logged in to update a station' },
        { status: 401 }
      );
    }
    
    // Check if the user is the station owner
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { ownerId: true },
    });
    
    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }
    
    if (station.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You must be the station owner to update it' },
        { status: 403 }
      );
    }
    
    const { name, description, imageUrl, playlistId } = await request.json();
    
    const updatedStation = await prisma.station.update({
      where: { id: stationId },
      data: {
        name,
        description,
        imageUrl,
        playlistId,
      },
    });
    
    return NextResponse.json(updatedStation);
  } catch (error) {
    console.error(`Error updating station ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update station' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a station
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
        { error: 'You must be logged in to delete a station' },
        { status: 401 }
      );
    }
    
    // Check if the user is the station owner
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { ownerId: true },
    });
    
    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }
    
    if (station.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You must be the station owner to delete it' },
        { status: 403 }
      );
    }
    
    // Delete the station
    await prisma.station.delete({
      where: { id: stationId },
    });
    
    return NextResponse.json({ message: 'Station deleted successfully' });
  } catch (error) {
    console.error(`Error deleting station ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete station' },
      { status: 500 }
    );
  }
}