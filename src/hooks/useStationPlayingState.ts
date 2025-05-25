import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/hooks/useSocket';
import { usePlayer } from '@/hooks/usePlayer';
import { getAuthUser } from '@/lib/session';
import { Station, StationTrack } from '@/hooks/useStationData';

interface PlayingState {
  isPlaying: boolean;
  currentTrackId: string | null;
  currentSpotifyId: string | null;
  trackName: string | null;
  trackArtist: string | null;
  playingUserId: string;
  playingUserName: string | null;
}

export function useStationPlayingState(stationId: string, station: Station | null) {
  const { data: session } = useSession();
  const { getCurrentPlaybackState } = usePlayer();
  const { isConnected, subscribe } = useSocket();
  
  const [redisPlayingState, setRedisPlayingState] = useState<PlayingState | null>(null);
  const [localPlayingTrack, setLocalPlayingTrack] = useState<StationTrack | null>(null);
  const [lastSocketUpdate, setLastSocketUpdate] = useState<number>(0);
  const [pollingInterval, setPollingInterval] = useState<number>(10000);

  // Log what song is currently playing
  useEffect(() => {
    if (redisPlayingState?.isPlaying) {
      console.log("🎵 Now playing:", redisPlayingState.trackName, "by", redisPlayingState.trackArtist);
    }
  }, [redisPlayingState?.trackName, redisPlayingState?.isPlaying]);

  // Fetch current playing state from Redis/database
  const fetchPlayingState = useCallback(async () => {
    try {
      const response = await fetch(`/api/stations/${stationId}/playing-state`);
      if (response.ok) {
        const data = await response.json();
        
        // Always set playing state, preserving track info even when paused
        setRedisPlayingState({
          isPlaying: data.isPlaying,
          currentTrackId: data.currentTrackId,
          currentSpotifyId: data.currentSpotifyId,
          trackName: data.trackName,
          trackArtist: data.trackArtist,
          playingUserId: data.playingUserId,
          playingUserName: data.playingUserName,
        });
      }
    } catch (error) {
      console.error("Error fetching playing state:", error);
    }
  }, [stationId]);

  // Function to update station playing state in Redis (real-time)
  const updateStationPlayingState = useCallback(async (
    isPlaying: boolean,
    currentTrackId?: string,
    currentSpotifyId?: string,
    trackName?: string,
    trackArtist?: string,
    trackImageUrl?: string
  ) => {
    try {
      const response = await fetch(`/api/stations/${stationId}/playing-state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPlaying,
          currentTrackId: currentTrackId || null,
          currentSpotifyId: currentSpotifyId || null,
          trackName: trackName || null,
          trackArtist: trackArtist || null,
          trackImageUrl: trackImageUrl || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Failed to update station playing state:", response.status, errorText);
      } else {
        const responseData = await response.json();
        console.log("✅ Updated station playing state in Redis:", responseData);
      }
    } catch (error) {
      console.error("Error updating station playing state:", error);
    }
  }, [stationId]);

  // Helper functions
  const isStationOwner = useCallback(() => {
    const user = getAuthUser(session);
    if (!user?.id || !station) return false;
    return station.owner.id === user.id;
  }, [session, station]);

  const isUserMember = useCallback(() => {
    const user = getAuthUser(session);
    if (!user?.id || !station) return false;
    return station.members.some((member) => member.userId === user.id);
  }, [session, station]);

  // Check if a specific track is currently playing
  const isTrackCurrentlyPlaying = useCallback((track: StationTrack): boolean => {
    // **PRIORITY 1: Redis state** - this is the most reliable real-time source
    if (redisPlayingState?.isPlaying) {
      if (redisPlayingState.currentTrackId === track.id) {
        return true;
      }
      // If Redis has a different track playing, this track is NOT playing
      return false;
    }
    
    // **PRIORITY 2: Database state** - fallback when Redis is not available
    if (station?.isPlaying) {
      if (station.currentTrackId === track.id) {
        return true;
      }
      // If database has a different track playing, this track is NOT playing
      return false;
    }
    
    // **PRIORITY 3: Local playing track** - only when no other state is available
    if (localPlayingTrack && !redisPlayingState?.isPlaying && !station?.isPlaying) {
      return localPlayingTrack.id === track.id;
    }
    
    // **FALLBACK: No playing state available** - nothing is playing
    return false;
  }, [redisPlayingState, station, localPlayingTrack]);

  // Station members only: Detect Spotify playback changes and update Redis
  useEffect(() => {
    if (!session?.user || !station) return;
    
    let lastPlayingTrackId: string | null = null;
    const user = getAuthUser(session);
    
    const checkOwnerPlayback = async () => {
      try {
        const state = await getCurrentPlaybackState();
        if (state?.item && state.is_playing) {
          const currentTrackId = state.item.id;
          
          // Only process if the track has changed
          if (currentTrackId !== lastPlayingTrackId) {
            lastPlayingTrackId = currentTrackId;
            
            // Try to find matching station track
            if (station?.tracks) {
              const foundMatch = station.tracks.find(track => {
                // Direct ID match for enriched tracks
                if (!track.trackId.startsWith("track-") && track.trackId === currentTrackId) {
                  return true;
                }
                // Name/artist match for ChartMasters tracks
                if (track.name && track.artist && state.item.name && state.item.type === 'track' && 'artists' in state.item && state.item.artists?.[0]?.name) {
                  const normalizeString = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, "").trim();
                  const trackName = normalizeString(track.name);
                  const trackArtist = normalizeString(track.artist);
                  const stateName = normalizeString(state.item.name);
                  const stateArtist = normalizeString(state.item.artists[0].name);
                  return trackName === stateName && trackArtist === stateArtist;
                }
                return false;
              });
              
              if (foundMatch) {
                console.log("✅ Playing station track:", foundMatch.name);
                // Update Redis for all station members
                updateStationPlayingState(
                  true, 
                  foundMatch.id, 
                  currentTrackId,
                  state.item.name,
                  'artists' in state.item ? state.item.artists[0]?.name : undefined,
                  'album' in state.item ? state.item.album.images[0]?.url : undefined
                ).catch(console.error);
              } else {
                updateStationPlayingState(false).catch(console.error);
              }
            }
          }
        } else {
          // No track playing or paused
          if (lastPlayingTrackId !== null) {
            lastPlayingTrackId = null;
            updateStationPlayingState(false).catch(console.error);
          }
        }
      } catch (error) {
        console.error("Error checking owner playback state:", error);
      }
    };

    // Only run for station members (owners and regular members)
    const userIsOwner = isStationOwner();
    const userIsMember = isUserMember();
    const canControlPlayback = user?.id && (userIsOwner || userIsMember);
    
    if (canControlPlayback) {
      // Check immediately when station data is loaded
      checkOwnerPlayback();
      
      // Set up periodic checking every 2 seconds for responsive updates
      const interval = setInterval(checkOwnerPlayback, 2000);
      
      return () => clearInterval(interval);
    }
  }, [station, session, getCurrentPlaybackState, isStationOwner, isUserMember, updateStationPlayingState]);

  // Smart polling with Socket.IO awareness and exponential backoff
  useEffect(() => {
    if (!stationId || !session?.user) return;

    const user = getAuthUser(session);
    const userIsOwner = isStationOwner();
    const userIsMember = isUserMember();

    const smartPoll = () => {
      const timeSinceLastSocketUpdate = Date.now() - lastSocketUpdate;
      const socketIsWorking = isConnected && timeSinceLastSocketUpdate < 30000; // Socket worked in last 30s
      
      // Always fetch if Socket.IO is not working, regardless of membership
      if (!socketIsWorking) {
        fetchPlayingState();
      }
      
      // Adjust polling frequency based on Socket.IO status
      if (socketIsWorking) {
        // Socket.IO is working, reduce polling frequency
        const reducedInterval = Math.min(pollingInterval * 1.5, 60000); // Max 1 minute
        setPollingInterval(reducedInterval);
      } else {
        // Socket.IO not working, increase polling frequency
        const increasedInterval = Math.max(pollingInterval * 0.7, 5000); // Min 5 seconds
        setPollingInterval(increasedInterval);
      }
    };

    // Initial poll
    smartPoll();
    
    const interval = setInterval(smartPoll, pollingInterval);
    return () => clearInterval(interval);
  }, [stationId, fetchPlayingState, session, station, lastSocketUpdate, isConnected, pollingInterval, isStationOwner, isUserMember]);

  // Listen for real-time Socket.IO updates
  useEffect(() => {
    if (!stationId) return;

    const unsubscribePlayingState = subscribe("station-playing-state", (data: any) => {
      if (data.stationId === stationId) {
        // Track Socket.IO activity for smart polling
        setLastSocketUpdate(Date.now());
        
        setRedisPlayingState({
          isPlaying: data.isPlaying,
          currentTrackId: data.currentTrackId,
          currentSpotifyId: data.currentSpotifyId,
          trackName: data.trackName,
          trackArtist: data.trackArtist,
          playingUserId: data.playingUserId,
          playingUserName: data.playingUserName,
        });

        // Clear local playing track since we now have Redis state
        setLocalPlayingTrack(null);
      }
    });

    return () => {
      unsubscribePlayingState();
    };
  }, [stationId, subscribe]);

  // Initial fetch
  useEffect(() => {
    if (stationId) {
      fetchPlayingState();
    }
  }, [fetchPlayingState]);

  return {
    redisPlayingState,
    localPlayingTrack,
    setLocalPlayingTrack,
    isTrackCurrentlyPlaying,
    updateStationPlayingState,
    isStationOwner,
    isUserMember,
    fetchPlayingState,
  };
}