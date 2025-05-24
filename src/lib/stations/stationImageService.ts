import { searchSpotifyTrack } from "@/lib/spotify-sdk/ServerInstance";
import { prisma } from "@/lib/prisma";

/**
 * Get Spotify track image for a station based on a random track
 */
export async function getStationImageFromSpotify(stationId: string): Promise<string | null> {
  try {
    // Get a random track from the station
    const trackCount = await prisma.stationTrack.count({
      where: { stationId }
    });

    if (trackCount === 0) {
      return null;
    }

    // Get a random track
    const randomOffset = Math.floor(Math.random() * trackCount);
    const randomTrack = await prisma.stationTrack.findFirst({
      where: { stationId },
      skip: randomOffset,
    });

    if (!randomTrack || !randomTrack.name || !randomTrack.artist) {
      return null;
    }

    // Search for the track on Spotify
    const searchQuery = `track:"${randomTrack.name}" artist:"${randomTrack.artist}"`;
    const track = await searchSpotifyTrack(searchQuery);

    if (track) {
      // Get the largest available image
      const images = track.album.images;
      if (images.length > 0) {
        // Return the first (largest) image
        return images[0].url;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting Spotify image for station ${stationId}:`, error);
    return null;
  }
}

/**
 * Update station image URL with Spotify artwork
 */
export async function updateStationImageFromSpotify(stationId: string): Promise<boolean> {
  try {
    const imageUrl = await getStationImageFromSpotify(stationId);
    
    if (imageUrl) {
      await prisma.station.update({
        where: { id: stationId },
        data: { imageUrl },
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error updating station image for ${stationId}:`, error);
    return false;
  }
}

/**
 * Update all system station images
 */
export async function updateAllSystemStationImages(): Promise<void> {
  try {
    const systemStations = await prisma.station.findMany({
      where: { isSystem: true },
      select: { id: true, name: true },
    });

    console.log(`Updating images for ${systemStations.length} system stations...`);

    for (const station of systemStations) {
      console.log(`Updating image for ${station.name}...`);
      const success = await updateStationImageFromSpotify(station.id);
      if (success) {
        console.log(`✅ Updated image for ${station.name}`);
      } else {
        console.log(`❌ Failed to update image for ${station.name}`);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Finished updating system station images');
  } catch (error) {
    console.error('Error updating system station images:', error);
  }
}

/**
 * Get fallback images for system stations
 */
export function getSystemStationFallbackImage(stationType: string): string {
  const fallbackImages = {
    'all-time': 'https://i.scdn.co/image/ab67616d0000b273a48964b5d9a3d6968ae3e0de',
    'kpop': 'https://i.scdn.co/image/ab67616d0000b273b3a4e3ff3dae07765ebc211a',
    'us-uk': 'https://i.scdn.co/image/ab67616d0000b273e8b066f70c206551210d902b',
    'random': 'https://i.scdn.co/image/ab67616d0000b273c5716278c917de4346f8dee3',
  };
  
  return fallbackImages[stationType as keyof typeof fallbackImages] || fallbackImages['all-time'];
}