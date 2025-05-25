import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "../../../auth/[...nextauth]/authOptions";
import { getAuthUser } from "@/lib/session";
import { stationPlayingStateService, StationPlayingState } from "@/lib/redis/stationPlayingState";

// In-memory cache for playing state with TTL
const playingStateCache = new Map<string, {
  data: any;
  expires: number;
}>();

// Rate limiting per IP
const rateLimitMap = new Map<string, {
  count: number;
  resetTime: number;
}>();

// Cache TTL: 3 seconds
const CACHE_TTL = 3000;
// Rate limit: 30 requests per minute per user (more generous)
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60000;

// PATCH: Update station playing state
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const stationId = params.id;
    const user = getAuthUser(session);
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

    // Rate limiting for updates - use user ID for better tracking
    const updateIdentifier = user?.id ? `${user.id}_update` : `${ip}_update`;
    if (!checkRateLimit(updateIdentifier, !!user?.id)) {
      return NextResponse.json(
        { error: `Rate limit exceeded for updates. Try again later. (${user?.id ? '60' : '30'} updates/min)` },
        { status: 429 }
      );
    }

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
      trackName,
      trackArtist,
      trackImageUrl,
    } = await request.json();

    // Create Redis state object
    const playingState: StationPlayingState = {
      isPlaying: isPlaying ?? false,
      currentTrackId: currentTrackId || null,
      currentSpotifyId: currentSpotifyId || null,
      trackName: trackName || null,
      trackArtist: trackArtist || null,
      trackImageUrl: trackImageUrl || null,
      playingUserId: user.id,
      playingUserName: user.name,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
    };

    // Update Redis with real-time state
    await stationPlayingStateService.updateStationPlayingState(stationId, playingState);

    // Invalidate cache for this station
    playingStateCache.delete(stationId);

    // Also update database for persistence (async, non-blocking)
    console.log('🗄️ Updating database with:', {
      stationId,
      isPlaying: isPlaying ?? false,
      currentTrackId: currentTrackId || null,
      currentSpotifyId: currentSpotifyId || null,
      playingUserId: user.id,
    });
    
    prisma.station.update({
      where: { id: stationId },
      data: {
        isPlaying: isPlaying ?? false,
        currentTrackId: currentTrackId || null,
        currentSpotifyId: currentSpotifyId || null,
        playingStartedAt: isPlaying ? new Date() : null,
        playingUserId: isPlaying ? user.id : null,
        lastActivityAt: new Date(),
      },
    }).then(result => {
      console.log('✅ Database updated successfully:', {
        stationId,
        isPlaying: result.isPlaying,
        currentTrackId: result.currentTrackId,
        currentSpotifyId: result.currentSpotifyId,
      });
    }).catch(error => {
      console.error('❌ Error updating database playing state:', error);
    });

    return NextResponse.json({
      success: true,
      playingState,
    });
  } catch (error) {
    console.error(`Error updating playing state for station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to update playing state" },
      { status: 500 }
    );
  }
}

// Rate limiting function with user preference
function checkRateLimit(identifier: string, isAuthenticated: boolean = false): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  const limit = isAuthenticated ? RATE_LIMIT * 2 : RATE_LIMIT; // Double limit for authenticated users

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Cache cleanup function
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of playingStateCache.entries()) {
    if (now > value.expires) {
      playingStateCache.delete(key);
    }
  }
}

// GET: Get current playing state from Redis (real-time) with caching and rate limiting
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // Get user session for better rate limiting
    const session = await getServerSession(authOptions);
    const user = getAuthUser(session);
    const identifier = user?.id || ip;
    const isAuthenticated = !!user?.id;

    // Rate limiting with higher limits for authenticated users
    if (!checkRateLimit(identifier, isAuthenticated)) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again later. (${isAuthenticated ? '60' : '30'} requests/min)` },
        { status: 429 }
      );
    }

    // Check cache first
    const cached = playingStateCache.get(stationId);
    const now = Date.now();
    
    if (cached && now < cached.expires) {
      console.log(`📦 Cache hit for station ${stationId}`);
      return NextResponse.json({
        ...cached.data,
        source: cached.data.source + '_cached',
      });
    }

    // Clean up expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance
      cleanupCache();
    }

    // Get real-time state from Redis
    const playingState = await stationPlayingStateService.getStationPlayingState(stationId);

    if (!playingState) {
      // Fallback to database if no Redis state
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
        },
      });

      if (!station) {
        return NextResponse.json(
          { error: "Station not found" },
          { status: 404 }
        );
      }

      const dbResult = {
        isPlaying: station.isPlaying || false,
        currentTrackId: station.currentTrackId,
        currentSpotifyId: station.currentSpotifyId,
        trackName: null,
        trackArtist: null,
        trackImageUrl: null,
        playingUserId: station.playingUser?.id || null,
        playingUserName: station.playingUser?.name || null,
        startedAt: station.playingStartedAt?.getTime() || null,
        lastUpdated: station.lastActivityAt?.getTime() || null,
        source: 'database',
      };

      // Cache the database result
      playingStateCache.set(stationId, {
        data: dbResult,
        expires: now + CACHE_TTL,
      });

      return NextResponse.json(dbResult);
    }

    const redisResult = {
      ...playingState,
      source: 'redis',
    };

    // Cache the Redis result
    playingStateCache.set(stationId, {
      data: redisResult,
      expires: now + CACHE_TTL,
    });

    return NextResponse.json(redisResult);
  } catch (error) {
    console.error(`Error fetching playing state for station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch playing state" },
      { status: 500 }
    );
  }
}