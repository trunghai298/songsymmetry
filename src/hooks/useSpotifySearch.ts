"use client";

import { useState, useCallback } from 'react';
import { Track } from "@spotify/web-api-ts-sdk";
import { debounce } from "lodash";
import { useSpotify } from "./useSpotify";

export function useSpotifySearch() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResult, setSearchResult] = useState<Track[]>();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { client } = useSpotify();

  const searchTrack = useCallback(async (q: string) => {
    if (!client || q.length <= 2) {
      setSearchResult(undefined);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await client.search(q, ["track"], undefined, 10);
      // Check if results.tracks exists and has items before setting the result
      if (results?.tracks?.items) {
        setSearchResult(results.tracks.items);
      } else {
        setSearchResult([]);
      }
      setError(null);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err : new Error('Search failed'));
      setSearchResult(undefined);
    } finally {
      setIsSearching(false);
    }
  }, [client]);

  const debouncedSearch = debounce(searchTrack, 500); // Reduced debounce time for better responsiveness with cache

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  return {
    searchQuery,
    searchResult,
    isSearching,
    error,
    handleQueryChange,
    searchTrack
  };
}