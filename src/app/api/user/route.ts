import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import authOptions from "../auth/[...nextauth]/authOptions";
import { getAuthUser } from "@/lib/session";

/**
 * GET /api/user
 * Returns the current user if authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = getAuthUser(session);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find the user in the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user
 * Creates or updates the user in the database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = getAuthUser(session);

    if (!user?.id || !user.name) {
      return NextResponse.json(
        { error: "Not authenticated or incomplete user data" },
        { status: 401 }
      );
    }

    // Create or update the user in the database
    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        image: user.image,
        spotifyId: (user as any).spotifyId,
        spotifyToken: user.spotifyToken,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        spotifyId: (user as any).spotifyId,
        spotifyToken: user.spotifyToken,
      },
    });

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return NextResponse.json(
      { error: "Failed to create/update user" },
      { status: 500 }
    );
  }
}
