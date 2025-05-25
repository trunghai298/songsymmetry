import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSpotifyClient } from "@/lib/spotify-sdk/ServerInstance";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { songId, songName, artist } = body;

    if (!songId) {
      return NextResponse.json(
        { error: "Song ID is required" },
        { status: 400 }
      );
    }

    // Get the song from database
    const song = await prisma.mostStreamedSongs.findUnique({
      where: { id: songId }
    });

    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }

    // If we already have Spotify data, return it
    if (song.spotifyId) {
      return NextResponse.json({
        message: "Song already has Spotify data",
        song: {
          id: song.id,
          spotifyId: song.spotifyId,
          thumbnail: song.thumbnail
        }
      });
    }

    // Search for the song on Spotify
    const searchQuery = `track:"${songName || song.name}" artist:"${artist || song.artist}"`;
    
    try {
      const spotifyClient = getServerSpotifyClient();
      const searchResults = await spotifyClient.search(searchQuery, ['track'], 'US', 1);
      
      if (searchResults.tracks.items.length > 0) {
        const spotifyTrack = searchResults.tracks.items[0];
        
        // Update the song with Spotify data
        const updatedSong = await prisma.mostStreamedSongs.update({
          where: { id: songId },
          data: {
            spotifyId: spotifyTrack.id,
            thumbnail: spotifyTrack.album.images[0]?.url || song.thumbnail,
            updatedAt: new Date()
          }
        });

        return NextResponse.json({
          message: "Song updated with Spotify data",
          song: {
            id: updatedSong.id,
            spotifyId: updatedSong.spotifyId,
            thumbnail: updatedSong.thumbnail,
            spotifyData: {
              name: spotifyTrack.name,
              artist: spotifyTrack.artists.map(a => a.name).join(", "),
              album: spotifyTrack.album.name,
              previewUrl: spotifyTrack.preview_url,
              externalUrl: spotifyTrack.external_urls.spotify
            }
          }
        });
      } else {
        // No Spotify match found
        return NextResponse.json({
          message: "No Spotify match found for this song",
          song: {
            id: song.id,
            spotifyId: null,
            thumbnail: song.thumbnail
          }
        }, { status:404 });
      }
    } catch (spotifyError) {
      console.error("Spotify search error:", spotifyError);
      return NextResponse.json(
        { error: "Failed to search Spotify" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error updating song Spotify data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to batch update songs without Spotify data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get songs without Spotify ID
    const songsWithoutSpotify = await prisma.mostStreamedSongs.findMany({
      where: {
        spotifyId: null,
        name: { not: null },
        artist: { not: null }
      },
      take: limit,
      skip: offset,
      orderBy: { streamCount: 'desc' }
    });

    if (songsWithoutSpotify.length === 0) {
      return NextResponse.json({
        message: "No more songs to update",
        processed: 0,
        remaining: 0
      });
    }

    let processed = 0;
    let errors = 0;
    const results = [];

    const spotifyClient = getServerSpotifyClient();

    for (const song of songsWithoutSpotify) {
      try {
        const searchQuery = `track:"${song.name}" artist:"${song.artist}"`;
        const searchResults = await spotifyClient.search(searchQuery, ['track'], 'US', 1);
        
        if (searchResults.tracks.items.length > 0) {
          const spotifyTrack = searchResults.tracks.items[0];
          
          await prisma.mostStreamedSongs.update({
            where: { id: song.id },
            data: {
              spotifyId: spotifyTrack.id,
              thumbnail: spotifyTrack.album.images[0]?.url || song.thumbnail,
              updatedAt: new Date()
            }
          });

          results.push({
            songId: song.id,
            name: song.name,
            artist: song.artist,
            spotifyId: spotifyTrack.id,
            updated: true
          });

          processed++;
        } else {
          results.push({
            songId: song.id,
            name: song.name,
            artist: song.artist,
            spotifyId: null,
            updated: false,
            reason: "No Spotify match found"
          });
        }

        // Add delay to avoid hitting Spotify rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing song ${song.id}:`, error);
        errors++;
        results.push({
          songId: song.id,
          name: song.name,
          artist: song.artist,
          updated: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Count remaining songs
    const remaining = await prisma.mostStreamedSongs.count({
      where: {
        spotifyId: null,
        name: { not: null },
        artist: { not: null }
      }
    });

    return NextResponse.json({
      message: `Processed ${processed} songs successfully, ${errors} errors`,
      processed,
      errors,
      remaining: remaining - processed,
      results
    });

  } catch (error) {
    console.error("Error in batch update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}