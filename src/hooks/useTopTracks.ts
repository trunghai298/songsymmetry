"use client";

import { useState, useEffect } from 'react';
import { MaxInt, Page, Track } from "@spotify/web-api-ts-sdk";
import { useSpotify } from './useSpotify';

// Define the allowed time range values that Spotify API accepts
type TimeRangeType = 'short_term' | 'medium_term' | 'long_term';

// By default, limit to 30 tracks (must use type assertion for MaxInt)
export function useTopTracks(timeRange: TimeRangeType = 'short_term', limit: MaxInt<50> = 30 as MaxInt<50>) {
  const [topTracks, setTopTracks] = useState<Page<Track>>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { client, isLoading: isClientLoading } = useSpotify();
  
  useEffect(() => {
    async function fetchTopTracks() {
      if (!client || isClientLoading) return;
      
      try {
        setIsLoading(true);
        const results = await client.getUserTopTracks(timeRange, limit);
        setTopTracks(results);
        setError(null);
      } catch (err) {
        console.error("Error fetching top tracks:", err);
        setError(err instanceof Error ? err : new Error('Failed to fetch top tracks'));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTopTracks();
  }, [client, isClientLoading, timeRange, limit]);
  
  return {
    topTracks,
    isLoading: isLoading || isClientLoading,
    error
  };
}