"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSession, signIn } from "next-auth/react";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { AuthUser } from "@/app/api/auth/[...nextauth]/authOptions";
import { Session } from "next-auth";

// Extend the Session type to include error property
interface ExtendedSession extends Session {
  error?: string;
}

interface SpotifyContextType {
  sdk: SpotifyApi | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
}

const SpotifyContext = createContext<SpotifyContextType>({
  sdk: null,
  isInitialized: false,
  isInitializing: false,
  error: null,
});

export const useSpotify = () => useContext(SpotifyContext);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const [sdk, setSdk] = useState<SpotifyApi | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when session changes
    if (status === "loading") return;

    // Handle session errors (like refresh token failure)
    if ((session as ExtendedSession)?.error === "RefreshAccessTokenError") {
      console.log("Refresh token error detected, redirecting to sign in");
      setError("Session expired. Please sign in again.");
      setSdk(null);
      setIsInitialized(false);
      signIn("spotify");
      return;
    }

    // Type guard to check if session.user has the expected structure
    const user = session?.user as AuthUser | undefined;

    // If no user or no token, reset state
    if (!user?.spotifyToken) {
      setSdk(null);
      setIsInitialized(false);
      setError(null);
      return;
    }

    // If already initialized or initializing, don't reinitialize
    if (isInitialized || isInitializing) return;

    const initializeSpotifyClient = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        // For client-side, we need to use NEXT_PUBLIC_ prefix
        const spotifyClient = SpotifyApi.withAccessToken(
          process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "",
          {
            access_token: user.spotifyToken as string,
            expires_in: user.expires_in || 3600,
            token_type: "Bearer",
            refresh_token: user.refresh_token || "",
          }
        );

        // Try a simple request to test if the token is valid
        await spotifyClient.currentUser.profile();

        setSdk(spotifyClient);
        setIsInitialized(true);
        console.log(
          "Spotify SDK initialized successfully for user:",
          user.email
        );
      } catch (error) {
        console.error("Error initializing Spotify SDK:", error);
        setError("Failed to initialize Spotify connection");

        // If token is invalid, trigger session update which should refresh the token
        console.log("Token might be expired, triggering session update");
        await update();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSpotifyClient();
  }, [session, status, isInitialized, isInitializing, update]);

  return (
    <SpotifyContext.Provider
      value={{ sdk, isInitialized, isInitializing, error }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}
