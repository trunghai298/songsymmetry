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
    maxAge: 24 * 60 * 60, // 24 hours instead of 1 hour
    updateAge: 2 * 60 * 60, // Update session every 2 hours
  },
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      if (!account) {
        return token;
      }

      const updatedToken = {
        ...token,
        access_token: account?.access_token,
        token_type: account?.token_type,
        expires_at: account?.expires_at ?? Date.now() / 1000,
        expires_in: (account?.expires_at ?? 0) - Date.now() / 1000,
        refresh_token: account?.refresh_token,
        scope: account?.scope,
        id: account?.providerAccountId,
      };

      // Convert expires_at to milliseconds for comparison with Date.now()
      const expiresAtMs = (updatedToken.expires_at as number) * 1000;
      
      // Check if the token is expired or about to expire (within 10 minutes)
      if (Date.now() >= expiresAtMs - 10 * 60 * 1000) {
        console.log("Token expired or about to expire, refreshing access token");
        return refreshAccessToken(updatedToken);
      }

      return updatedToken;
    },
    async session({ session, token }: { session: any; token: any }) {
      const user: AuthUser = {
        ...session.user,
        access_token: token.access_token,
        token_type: token.token_type,
        expires_at: token.expires_at,
        expires_in: token.expires_in,
        refresh_token: token.refresh_token,
        scope: token.scope,
        id: token.id,
        // Add the token for easier access
        spotifyToken: token.access_token,
      };
      session.user = user;
      session.error = token.error;
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET || "secret",
};

export default authOptions;
