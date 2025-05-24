"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to explore page immediately
    router.replace("/explore");
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="h-full min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-white">Loading...</p>
      </div>
    </div>
  );
}
