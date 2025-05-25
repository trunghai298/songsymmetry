import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSpotifyClient } from "@/lib/spotify-sdk/ServerInstance";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { albumId, albumName, artist } = body;

    if (!albumId) {
      return NextResponse.json(
        { error: "Album ID is required" },
        { status: 400 }
      );
    }

    // Get the album from database
    const album = await prisma.mostStreamedAlbums.findUnique({
      where: { id: albumId }
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    // If we already have Spotify data, return it
    if (album.spotifyId) {
      return NextResponse.json({
        message: "Album already has Spotify data",
        album: {
          id: album.id,
          spotifyId: album.spotifyId,
          thumbnail: album.thumbnail
        }
      });
    }

    // Search for the album on Spotify
    const searchQuery = `album:"${albumName || album.albName}" artist:"${artist || album.artist}"`;
    
    try {
      const spotifyClient = getServerSpotifyClient();
      const searchResults = await spotifyClient.search(searchQuery, ['album'], 'US', 1);
      
      if (searchResults.albums.items.length > 0) {
        const spotifyAlbum = searchResults.albums.items[0];
        
        // Update the album with Spotify data
        const updatedAlbum = await prisma.mostStreamedAlbums.update({
          where: { id: albumId },
          data: {
            spotifyId: spotifyAlbum.id,
            thumbnail: spotifyAlbum.images[0]?.url || album.thumbnail,
            updatedAt: new Date()
          }
        });

        return NextResponse.json({
          message: "Album updated with Spotify data",
          album: {
            id: updatedAlbum.id,
            spotifyId: updatedAlbum.spotifyId,
            thumbnail: updatedAlbum.thumbnail,
            spotifyData: {
              name: spotifyAlbum.name,
              artist: spotifyAlbum.artists.map(a => a.name).join(", "),
              releaseDate: spotifyAlbum.release_date,
              totalTracks: spotifyAlbum.total_tracks,
              albumType: spotifyAlbum.album_type,
              externalUrl: spotifyAlbum.external_urls.spotify
            }
          }
        });
      } else {
        // No Spotify match found
        return NextResponse.json({
          message: "No Spotify match found for this album",
          album: {
            id: album.id,
            spotifyId: null,
            thumbnail: album.thumbnail
          }
        }, { status: 404 });
      }
    } catch (spotifyError) {
      console.error("Spotify search error:", spotifyError);
      return NextResponse.json(
        { error: "Failed to search Spotify" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error updating album Spotify data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to batch update albums without Spotify data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get albums without Spotify ID
    const albumsWithoutSpotify = await prisma.mostStreamedAlbums.findMany({
      where: {
        spotifyId: null,
        albName: { not: null },
        artist: { not: null }
      },
      take: limit,
      skip: offset,
      orderBy: { streamCount: 'desc' }
    });

    if (albumsWithoutSpotify.length === 0) {
      return NextResponse.json({
        message: "No more albums to update",
        processed: 0,
        remaining: 0
      });
    }

    let processed = 0;
    let errors = 0;
    const results = [];

    const spotifyClient = getServerSpotifyClient();

    for (const album of albumsWithoutSpotify) {
      try {
        const searchQuery = `album:"${album.albName}" artist:"${album.artist}"`;
        const searchResults = await spotifyClient.search(searchQuery, ['album'], 'US', 1);
        
        if (searchResults.albums.items.length > 0) {
          const spotifyAlbum = searchResults.albums.items[0];
          
          await prisma.mostStreamedAlbums.update({
            where: { id: album.id },
            data: {
              spotifyId: spotifyAlbum.id,
              thumbnail: spotifyAlbum.images[0]?.url || album.thumbnail,
              updatedAt: new Date()
            }
          });

          results.push({
            albumId: album.id,
            albName: album.albName,
            artist: album.artist,
            spotifyId: spotifyAlbum.id,
            updated: true
          });

          processed++;
        } else {
          results.push({
            albumId: album.id,
            albName: album.albName,
            artist: album.artist,
            spotifyId: null,
            updated: false,
            reason: "No Spotify match found"
          });
        }

        // Add delay to avoid hitting Spotify rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing album ${album.id}:`, error);
        errors++;
        results.push({
          albumId: album.id,
          albName: album.albName,
          artist: album.artist,
          updated: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Count remaining albums
    const remaining = await prisma.mostStreamedAlbums.count({
      where: {
        spotifyId: null,
        albName: { not: null },
        artist: { not: null }
      }
    });

    return NextResponse.json({
      message: `Processed ${processed} albums successfully, ${errors} errors`,
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