import { Session } from "next-auth";
import { AuthUser } from "@/app/api/auth/[...nextauth]/authOptions";

/**
 * Get the authenticated user with proper typing
 * This is a helper function to handle the common type assertion pattern
 * for accessing the id, spotifyToken, etc. properties
 */
export function getAuthUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  return session.user as AuthUser;
}

/**
 * Type guard to check if a session includes an authenticated user with an ID
 */
export function isAuthenticated(session: Session | null): boolean {
  const user = getAuthUser(session);
  return !!user?.id;
}
