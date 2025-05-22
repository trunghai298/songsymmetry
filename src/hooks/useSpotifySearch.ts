"use client";

import { useState, useCallback } from "react";
import { Track } from "@spotify/web-api-ts-sdk";
import { debounce } from "lodash";
import { useSpotify } from "./useSpotify";

export function useSpotifySearch() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResult, setSearchResult] = useState<Track[]>();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { client } = useSpotify();

  const searchTrack = useCallback(
    async (q: string) => {
      console.log("Searching for:", q);
      console.log("Client available:", !!client);

      if (!client || q.length <= 2) {
        console.log("Search aborted: client unavailable or query too short");
        setSearchResult(undefined);
        setIsSearching(false);
        return undefined;
      }

      setIsSearching(true);
      try {
        console.log("Making Spotify API search call:", q);
        // Ensure we're using the correct ItemTypes from SDK
        const results = await client.search(q, ["track"], "US", 10 as any);
        // Check if results.tracks exists and has items before setting the result
        if (results?.tracks?.items && results.tracks.items.length > 0) {
          console.log("Found tracks:", results.tracks.items.length);
          console.log(
            "First track:",
            results.tracks.items[0].name,
            "by",
            results.tracks.items[0].artists[0].name
          );
          setSearchResult(results.tracks.items);
          return results.tracks.items;
        } else {
          console.log("No tracks found in results");
          setSearchResult([]);
          setError(null);
          return [];
        }
      } catch (err) {
        console.error("Search error:", err);
        setError(err instanceof Error ? err : new Error("Search failed"));
        setSearchResult(undefined);
        return undefined;
      } finally {
        setIsSearching(false);
      }
    },
    [client]
  );

  const debouncedSearch = debounce(searchTrack, 500); // Reduced debounce time for better responsiveness with cache

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  return {
    searchQuery,
    searchResult,
    isSearching,
    error,
    handleQueryChange,
    searchTrack,
  };
}
