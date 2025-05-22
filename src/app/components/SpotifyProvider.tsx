'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { AuthUser } from '@/app/api/auth/[...nextauth]/authOptions';

interface SpotifyContextType {
  sdk: SpotifyApi | null;
  isInitialized: boolean;
  isInitializing: boolean;
}

const SpotifyContext = createContext<SpotifyContextType>({
  sdk: null,
  isInitialized: false,
  isInitializing: false,
});

export const useSpotify = () => useContext(SpotifyContext);

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [sdk, setSdk] = useState<SpotifyApi | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    // Type guard to check if session.user has the expected structure
    const user = session?.user as AuthUser | undefined;
    if (!user?.spotifyToken || isInitialized || isInitializing) return;

    const initializeSpotifyClient = async () => {
      setIsInitializing(true);
      try {
        // For client-side, we need to use NEXT_PUBLIC_ prefix
        const spotifyClient = SpotifyApi.withAccessToken(
          process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
          {
            access_token: user.spotifyToken as string,
            expires_in: 3600, // We'll need to refresh the token before this expires
            token_type: 'Bearer',
            refresh_token: user.refresh_token || 'dummy-refresh-token', // Add refresh token from the session
          }
        );

        // Try a simple request to test if the token is valid
        await spotifyClient.currentUser.profile();
        
        setSdk(spotifyClient);
        setIsInitialized(true);
        console.log('Spotify SDK initialized successfully');
      } catch (error) {
        console.error('Error initializing Spotify SDK:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSpotifyClient();
  }, [session, isInitialized, isInitializing]);

  return (
    <SpotifyContext.Provider value={{ sdk, isInitialized, isInitializing }}>
      {children}
    </SpotifyContext.Provider>
  );
}