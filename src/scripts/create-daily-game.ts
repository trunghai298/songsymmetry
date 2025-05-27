import { prisma } from "../lib/prisma";
import { spotifyTrackService } from "../lib/spotify/trackService";

async function createDailyGame() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if we already have 2 games for today (maximum allowed)
    const existingGames = await prisma.dailySongGame.findMany({
      where: { 
        date: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0)
        }
      },
      orderBy: { date: 'asc' }
    });

    if (existingGames.length >= 2) {
      console.log(`Maximum of 2 games already exist for today. Games: ${existingGames.map(g => g.songName).join(', ')}`);
      return;
    }

    if (existingGames.length > 0) {
      console.log(`Found ${existingGames.length} existing game(s) for today, creating additional game`);
    }

    // Get a random popular song with Spotify ID
    const randomSong = await prisma.mostStreamedSongs.findFirst({
      where: {
        spotifyId: { not: null },
        name: { not: null },
        artist: { not: null }
      },
      skip: Math.floor(Math.random() * 500) // Random offset in top 500
    });

    if (!randomSong || !randomSong.spotifyId) {
      console.log("No suitable songs found");
      return;
    }

    console.log(`🎵 Selected song: ${randomSong.name} by ${randomSong.artist}`);
    console.log(`🔍 Fetching full data from Spotify for ID: ${randomSong.spotifyId}`);

    // Fetch full track data from Spotify
    let spotifyData;
    try {
      spotifyData = await spotifyTrackService.getTrackData(randomSong.spotifyId);
      console.log("✅ Successfully fetched Spotify data");
    } catch (error) {
      console.error("❌ Failed to fetch Spotify data:", error);
      console.log("📝 Using database data as fallback");
      
      // Fallback to database data if Spotify fetch fails
      spotifyData = {
        songId: randomSong.spotifyId,
        songName: randomSong.name!,
        artistName: randomSong.artist!,
        albumName: null,
        releaseYear: randomSong.year ? parseInt(randomSong.year) : null,
        popularity: null,
        durationMs: null,
        imageUrl: randomSong.thumbnail || null,
        isExplicit: null
      };
    }

    // Create today's game with enhanced Spotify data
    const game = await prisma.dailySongGame.create({
      data: {
        date: today,
        songId: spotifyData.songId,
        songName: spotifyData.songName,
        artistName: spotifyData.artistName,
        albumName: spotifyData.albumName,
        genre: randomSong.genre, // Keep from database as Spotify doesn't always provide genres
        releaseYear: spotifyData.releaseYear,
        popularity: spotifyData.popularity,
        durationMs: spotifyData.durationMs,
        imageUrl: spotifyData.imageUrl,
        isExplicit: spotifyData.isExplicit
      }
    });

    console.log("✅ Created daily game with full Spotify data:", {
      song: game.songName,
      artist: game.artistName,
      album: game.albumName,
      year: game.releaseYear,
      popularity: game.popularity,
      duration: game.durationMs ? `${Math.round(game.durationMs / 1000)}s` : 'unknown',
      explicit: game.isExplicit ? 'Yes' : 'No',
      date: game.date.toDateString()
    });
  } catch (error) {
    console.error("Error creating daily game:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createDailyGame();