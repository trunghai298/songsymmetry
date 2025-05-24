"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import React from "react";

function AuthSessionProvider({
  session,
  children,
}: {
  children: React.ReactNode;
  session: Session | null | undefined;
}) {
  return (
    <SessionProvider 
      session={session}
      refetchInterval={5 * 60} // Refetch every 5 minutes instead of default 
      refetchOnWindowFocus={false} // Don't refetch when window gains focus
    >
      {children}
    </SessionProvider>
  );
}

export default AuthSessionProvider;
