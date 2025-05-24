"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { CachedSpotifyClient } from "./CachedSpotifyClient";
import rawSdk from "./ClientInstance";

interface SpotifyContextType {
  client: CachedSpotifyClient | null;
  isLoading: boolean;
  error: Error | null;
  clearCache: () => void;
}

const SpotifyContext = createContext<SpotifyContextType>({
  client: null,
  isLoading: true,
  error: null,
  clearCache: () => {},
});

export const useSpotifyContext = () => useContext(SpotifyContext);

interface SpotifyProviderProps {
  children: ReactNode;
}

let cachedClient: CachedSpotifyClient | null = null;

export const SpotifyProvider = ({ children }: SpotifyProviderProps) => {
  const [client, setClient] = useState<CachedSpotifyClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        setIsLoading(true);

        // Check if we already have the client instance
        if (cachedClient) {
          console.log("Using cached Spotify client");
          setClient(cachedClient);
          setIsLoading(false);
          return;
        }

        // Initialize and test the client
        try {
          console.log("Initializing Spotify client");
          // Test the connection by getting the current user profile
          const userProfile = await rawSdk.currentUser.profile();
          console.log(
            "Spotify user profile retrieved:",
            userProfile.display_name
          );

          // Create a new cached client
          cachedClient = new CachedSpotifyClient(rawSdk);
          console.log("CachedSpotifyClient created successfully");
          setClient(cachedClient);
          setError(null);
        } catch (err) {
          console.error("Error initializing Spotify client:", err);
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to initialize Spotify client")
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    initClient();
  }, []);

  const clearCache = () => {
    if (client) {
      client.clearCache();
    }
  };

  return (
    <SpotifyContext.Provider value={{ client, isLoading, error, clearCache }}>
      {children}
    </SpotifyContext.Provider>
  );
};
