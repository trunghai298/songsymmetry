"use client";

import { useSpotifyContext } from '@/lib/spotify-sdk/SpotifyContext';

export function useSpotify() {
  return useSpotifyContext();
}