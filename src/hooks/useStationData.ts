import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface Station {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  playlistId: string | null;
  createdAt: string;
  updatedAt: string;
  isPlaying?: boolean;
  currentTrackId?: string | null;
  currentSpotifyId?: string | null;
  playingStartedAt?: string | null;
  playingUserId?: string | null;
  lastActivityAt?: string | null;
  isSystem?: boolean;
  stationType?: string | null;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  playingUser?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  members: StationMember[];
  tracks: StationTrack[];
  _count: {
    members: number;
    tracks: number;
  };
}

interface StationMember {
  id: string;
  joinedAt: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface StationTrack {
  id: string;
  trackId: string;
  name: string | null;
  artist: string | null;
  imageUrl: string | null;
  addedAt: string;
  addedById: string;
  addedBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export function useStationData(stationId: string) {
  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchStationData = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const response = await fetch(`/api/stations/${stationId}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: "Station not found",
              description: "This station doesn't exist or has been deleted",
              variant: "destructive",
            });
            router.push("/station");
            return;
          }
          throw new Error("Failed to fetch station");
        }

        const data = await response.json();

        // Make sure we have an array of tracks even if it's undefined in the response
        if (!data.tracks) {
          data.tracks = [];
        }

        setStation(data);
      } catch (error) {
        console.error("Error fetching station:", error);
        toast({
          title: "Error",
          description: "Failed to load station data",
          variant: "destructive",
        });
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [stationId, toast, router]
  );

  return {
    station,
    setStation,
    isLoading,
    fetchStationData,
  };
}

export type { Station, StationMember, StationTrack };