"use client";

import {
  AccessToken,
  IAuthStrategy,
  SdkConfiguration,
  SdkOptions,
  SpotifyApi,
} from "@spotify/web-api-ts-sdk";
import { AuthUser } from "@/app/api/auth/[...nextauth]/authOptions";
import { getSession, signIn } from "next-auth/react";

/**
 * A class that implements the IAuthStrategy interface and wraps the NextAuth functionality.
 * It retrieves the access token and other information from the JWT session handled by NextAuth.
 */
class NextAuthStrategy implements IAuthStrategy {
  public getOrCreateAccessToken(): Promise<AccessToken> {
    return this.getAccessToken();
  }

  public async getAccessToken(): Promise<AccessToken> {
    const session: any = await getSession();
    if (!session) {
      console.log("No session found, returning empty token");
      return {} as AccessToken;
    }

    if (session?.error === "RefreshAccessTokenError") {
      console.log("Refresh token error, redirecting to sign in");
      await signIn('spotify');
      return {} as AccessToken;
    }

    const { user }: { user: AuthUser } = session;

    if (!user?.access_token) {
      console.log("No access token in session, returning empty token");
      return {} as AccessToken;
    }

    // Check if token is expired or about to expire
    const now = Math.floor(Date.now() / 1000);
    const tokenExpiresAt = user.expires_at;
    
    if (tokenExpiresAt && now >= tokenExpiresAt - 300) { // 5 minutes buffer
      console.log("Token expired or about to expire, triggering session update");
      // Force session refresh by calling getSession again
      const updatedSession: any = await getSession();
      if (updatedSession?.user?.access_token) {
        const { user: updatedUser }: { user: AuthUser } = updatedSession;
        return {
          access_token: updatedUser.access_token,
          token_type: "Bearer",
          expires_in: updatedUser.expires_in,
          expires: updatedUser.expires_at,
          refresh_token: updatedUser.refresh_token,
        } as AccessToken;
      }
    }

    return {
      access_token: user.access_token,
      token_type: "Bearer",
      expires_in: user.expires_in,
      expires: user.expires_at,
      refresh_token: user.refresh_token,
    } as AccessToken;
  }

  public removeAccessToken(): void {
    console.warn("[Spotify-SDK][WARN]\nremoveAccessToken not implemented");
  }

  public setConfiguration(configuration: SdkConfiguration): void {
    console.warn("[Spotify-SDK][WARN]\nsetConfiguration not implemented");
  }
}

function withNextAuthStrategy(config?: SdkOptions) {
  const strategy = new NextAuthStrategy();
  return new SpotifyApi(strategy, config);
}

export default withNextAuthStrategy();
