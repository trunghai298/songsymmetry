import { useState, useEffect } from 'react';
import { useSpotifyContext } from '@/lib/spotify-sdk/SpotifyContext';
import { Album } from '@spotify/web-api-ts-sdk';

interface SpotifyAlbumData {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; height?: number; width?: number }[];
  release_date: string;
  total_tracks: number;
  external_urls: { spotify: string };
}

interface UseSpotifyAlbumReturn {
  spotifyAlbum: SpotifyAlbumData | null;
  isLoading: boolean;
  error: string | null;
  spotifyImageUrl: string | null;
}

interface UseSpotifyAlbumOptions {
  enabled?: boolean;
  fallbackImage?: string;
}

export const useSpotifyAlbum = (
  albumName: string,
  artistName: string,
  options: UseSpotifyAlbumOptions = {}
): UseSpotifyAlbumReturn => {
  const { enabled = true, fallbackImage } = options;
  const { client } = useSpotifyContext();
  const [spotifyAlbum, setSpotifyAlbum] = useState<SpotifyAlbumData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !client || !albumName || !artistName) {
      return;
    }

    const searchAlbum = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Search for the album using both album name and artist name for better accuracy
        const searchQuery = `album:"${albumName}" artist:"${artistName}"`;
        const searchResults = await client.search(searchQuery, ['album'], 'US', 1);

        if (searchResults.albums?.items && searchResults.albums.items.length > 0) {
          const album = searchResults.albums.items[0];
          
          // Transform to our interface
          const albumData: SpotifyAlbumData = {
            id: album.id,
            name: album.name,
            artists: album.artists.map(artist => ({
              id: artist.id,
              name: artist.name
            })),
            images: album.images,
            release_date: album.release_date,
            total_tracks: album.total_tracks,
            external_urls: album.external_urls
          };

          setSpotifyAlbum(albumData);
        } else {
          // No results found
          setSpotifyAlbum(null);
          setError('Album not found on Spotify');
        }
      } catch (err: any) {
        console.error('Error searching for album:', err);
        setError(err.message || 'Failed to search for album');
        setSpotifyAlbum(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(searchAlbum, 300);

    return () => clearTimeout(timeoutId);
  }, [client, albumName, artistName, enabled]);

  // Get the best quality image URL, fallback to chartmaster image
  const spotifyImageUrl = spotifyAlbum?.images?.[0]?.url || fallbackImage || null;

  return {
    spotifyAlbum,
    isLoading,
    error,
    spotifyImageUrl
  };
};

// Hook for batch loading multiple albums with lazy loading support
export const useSpotifyAlbumBatch = () => {
  const { client } = useSpotifyContext();
  const [albumCache, setAlbumCache] = useState<Map<string, SpotifyAlbumData | null>>(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const searchAlbum = async (albumName: string, artistName: string): Promise<SpotifyAlbumData | null> => {
    const cacheKey = `${albumName}-${artistName}`;
    
    // Return cached result if available
    if (albumCache.has(cacheKey)) {
      return albumCache.get(cacheKey) || null;
    }

    // Don't search if already loading
    if (loadingIds.has(cacheKey)) {
      return null;
    }

    if (!client || !albumName || !artistName) {
      return null;
    }

    setLoadingIds(prev => new Set(prev).add(cacheKey));

    try {
      const searchQuery = `album:"${albumName}" artist:"${artistName}"`;
      const searchResults = await client.search(searchQuery, ['album'], 'US', 1);

      let albumData: SpotifyAlbumData | null = null;

      if (searchResults.albums?.items && searchResults.albums.items.length > 0) {
        const album = searchResults.albums.items[0];
        albumData = {
          id: album.id,
          name: album.name,
          artists: album.artists.map(artist => ({
            id: artist.id,
            name: artist.name
          })),
          images: album.images,
          release_date: album.release_date,
          total_tracks: album.total_tracks,
          external_urls: album.external_urls
        };
      }

      // Cache the result (even if null)
      setAlbumCache(prev => new Map(prev).set(cacheKey, albumData));
      return albumData;

    } catch (err: any) {
      console.error('Error searching for album:', err);
      // Cache null result to avoid repeated failed requests
      setAlbumCache(prev => new Map(prev).set(cacheKey, null));
      return null;
    } finally {
      setLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  };

  const getAlbumData = (albumName: string, artistName: string): SpotifyAlbumData | null => {
    const cacheKey = `${albumName}-${artistName}`;
    return albumCache.get(cacheKey) || null;
  };

  const isLoading = (albumName: string, artistName: string): boolean => {
    const cacheKey = `${albumName}-${artistName}`;
    return loadingIds.has(cacheKey);
  };

  const getSpotifyImageUrl = (albumName: string, artistName: string, fallbackImage?: string): string | null => {
    const albumData = getAlbumData(albumName, artistName);
    return albumData?.images?.[0]?.url || fallbackImage || null;
  };

  return {
    searchAlbum,
    getAlbumData,
    isLoading,
    getSpotifyImageUrl,
    albumCache: albumCache.size
  };
};