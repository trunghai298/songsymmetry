"use client";

import { useState, useEffect } from 'react';
import { Page, Track } from "@spotify/web-api-ts-sdk";
import { useSpotify } from './useSpotify';

export function useTopTracks(timeRange = 'short_term', limit = 30) {
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