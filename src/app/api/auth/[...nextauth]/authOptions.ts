import spotifyProfile, { refreshAccessToken } from "./spotifyProfile";
import { Account, AuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";

export type AuthUser = {
  name: string;
  email: string;
  image: string;
  access_token: string;
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  scope: string;
  id: string;
  // Added for easier access in components
  spotifyToken?: string;
};

const authOptions: AuthOptions = {
  providers: [spotifyProfile],
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 5 * 60, // Update session every 5 minutes to trigger token refresh checks
  },
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      // If this is the first time (account exists), save the tokens
      if (account) {
        const newToken = {
          ...token,
          access_token: account.access_token,
          token_type: account.token_type,
          expires_at: account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          refresh_token: account.refresh_token,
          scope: account.scope,
          id: account.providerAccountId,
        };
        console.log("Initial token saved for user:", token.email);
        return newToken;
      }

      // For subsequent requests, check if we need to refresh the token
      if (!token.access_token || !token.expires_at) {
        console.log("Missing token data, returning token as-is");
        return token;
      }

      // Convert expires_at to milliseconds for comparison with Date.now()
      const expiresAtMs = (token.expires_at as number) * 1000;
      
      // Check if the token is expired or about to expire (within 5 minutes)
      if (Date.now() >= expiresAtMs - 5 * 60 * 1000) {
        console.log("Token expired or about to expire, refreshing access token for:", token.email);
        const refreshedToken = await refreshAccessToken(token);
        
        // If refresh failed, return the error
        if ('error' in refreshedToken && refreshedToken.error) {
          console.error("Token refresh failed for:", token.email);
          return refreshedToken;
        }
        
        console.log("Token refreshed successfully for:", token.email);
        return refreshedToken;
      }

      // Token is still valid
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      // If there's an error with the token (like refresh failure), include it in the session
      if (token.error) {
        session.error = token.error;
        console.error("Session error:", token.error, "for user:", token.email);
        return session;
      }

      // Calculate the current expires_in value based on expires_at
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = token.expires_at ? (token.expires_at as number) - now : 0;

      const user: AuthUser = {
        ...session.user,
        access_token: token.access_token,
        token_type: token.token_type,
        expires_at: token.expires_at,
        expires_in: expiresIn,
        refresh_token: token.refresh_token,
        scope: token.scope,
        id: token.id,
        // Add the token for easier access
        spotifyToken: token.access_token,
      };
      session.user = user;
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET || "secret",
};

export default authOptions;
