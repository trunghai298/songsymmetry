"use client";

import { useState, useEffect } from 'react';
import { MaxInt, Page, Artist } from "@spotify/web-api-ts-sdk";
import { useSpotify } from './useSpotify';

type TimeRangeType = 'short_term' | 'medium_term' | 'long_term';

export function useTopArtists(timeRange: TimeRangeType = 'short_term', limit: MaxInt<50> = 20 as MaxInt<50>) {
  const [topArtists, setTopArtists] = useState<Page<Artist>>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { client, isLoading: isClientLoading } = useSpotify();
  
  useEffect(() => {
    async function fetchTopArtists() {
      if (!client || isClientLoading) return;
      
      try {
        setIsLoading(true);
        const results = await client.getUserTopArtists(timeRange, limit);
        setTopArtists(results);
        setError(null);
      } catch (err) {
        console.error("Error fetching top artists:", err);
        setError(err instanceof Error ? err : new Error('Failed to fetch top artists'));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTopArtists();
  }, [client, isClientLoading, timeRange, limit]);
  
  return {
    topArtists,
    isLoading: isLoading || isClientLoading,
    error
  };
}