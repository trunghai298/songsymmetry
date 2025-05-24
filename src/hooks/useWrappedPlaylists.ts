"use client";

import { useState, useEffect } from 'react';
import { useSpotifyContext } from '@/lib/spotify-sdk/SpotifyContext';

interface WrappedPlaylist {
  id: string;
  name: string;
  year: number;
  description: string;
  images: Array<{ url: string; height?: number; width?: number }>;
  tracks: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
}

export function useWrappedPlaylists() {
  const { client } = useSpotifyContext();
  const [wrappedPlaylists, setWrappedPlaylists] = useState<WrappedPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWrappedPlaylists = async () => {
      if (!client) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Fetching owned and followed playlists...');
        const allPlaylists: WrappedPlaylist[] = [];
        let offset = 0;
        const limit = 50;
        let hasMore = true;

        // Fetch all user playlists (owned AND followed) using me/playlists endpoint
        while (hasMore) {
          const response = await client.getCurrentUserPlaylists(limit as any, offset);
          
          console.log(`Fetched ${response.items.length} playlists, offset: ${offset}`);
          console.log('Sample playlists:', response.items.slice(0, 3).map((p: any) => ({
            name: p.name,
            owner: p.owner?.display_name || p.owner?.id,
            public: p.public,
            collaborative: p.collaborative
          })));
          
          if (!response.items || response.items.length === 0) {
            hasMore = false;
            break;
          }

          // Filter for wrapped playlists with more comprehensive patterns
          const wrappedItems = response.items.filter((playlist: any) => {
            const name = playlist.name.toLowerCase();
            
            // Check for various wrapped playlist patterns
            const wrappedPatterns = [
              /your top songs 20\d{2}/i,
              /top songs 20\d{2}/i,
              /wrapped 20\d{2}/i,
              /spotify wrapped 20\d{2}/i,
              /your 20\d{2} wrapped/i,
              /my top songs 20\d{2}/i
            ];
            
            const isWrapped = wrappedPatterns.some(pattern => pattern.test(playlist.name));
            
            if (isWrapped) {
              console.log('Found wrapped playlist:', {
                name: playlist.name,
                owner: playlist.owner?.display_name || playlist.owner?.id,
                public: playlist.public,
                collaborative: playlist.collaborative,
                tracks: playlist.tracks?.total
              });
            }
            
            return isWrapped;
          });

          // Extract year and format playlist data
          const formattedWrapped = wrappedItems.map((playlist: any) => {
            const yearMatch = playlist.name.match(/20(\d{2})/);
            const year = yearMatch ? parseInt(`20${yearMatch[1]}`) : new Date().getFullYear();
            
            return {
              id: playlist.id,
              name: playlist.name,
              year,
              description: playlist.description || '',
              images: playlist.images || [],
              tracks: playlist.tracks,
              external_urls: playlist.external_urls
            };
          });

          allPlaylists.push(...formattedWrapped);
          
          offset += limit;
          hasMore = response.items.length === limit;
        }

        console.log(`Found ${allPlaylists.length} wrapped playlists total`);

        // Remove duplicates based on playlist ID
        const uniquePlaylists = allPlaylists.filter((playlist, index, self) =>
          index === self.findIndex(p => p.id === playlist.id)
        );

        // Sort by year (newest first)
        const sortedPlaylists = uniquePlaylists.sort((a, b) => b.year - a.year);
        setWrappedPlaylists(sortedPlaylists);

      } catch (error: any) {
        console.error('Error fetching wrapped playlists:', error);
        setError(error.message || 'Failed to fetch wrapped playlists');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWrappedPlaylists();
  }, [client]);

  return {
    wrappedPlaylists,
    isLoading,
    error
  };
}