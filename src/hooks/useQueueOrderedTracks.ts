"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSpotify } from "@/hooks/useSpotify";
import { useStationQueue } from "@/hooks/useStationQueue";
import { getAuthUser } from "@/lib/session";
import { StationTrack } from "@/hooks/useStationData";

// Extended track type with queue information
type TrackWithQueueInfo = StationTrack & {
  queuePosition?: number | null;
  isInQueue?: boolean;
};

interface QueueOrderedTracksOptions {
  tracks: StationTrack[];
  isCurrentPlayer: boolean;
  enableQueueOrdering: boolean;
  isTrackCurrentlyPlaying: (track: StationTrack) => boolean;
  stationId: string;
  redisPlayingState?: {
    isPlaying: boolean;
    currentTrackId: string | null;
    currentSpotifyId: string | null;
  } | null;
}

export const useQueueOrderedTracks = ({ 
  tracks, 
  isCurrentPlayer, 
  enableQueueOrdering,
  isTrackCurrentlyPlaying,
  stationId,
  redisPlayingState 
}: QueueOrderedTracksOptions) => {
  const { data: session } = useSession();
  const { client: spotify } = useSpotify();
  const [orderedTracks, setOrderedTracks] = useState<TrackWithQueueInfo[]>(tracks);
  const [queueOrder, setQueueOrder] = useState<string[]>([]);
  
  const user = getAuthUser(session);
  
  // Subscribe to broadcasted queue updates for non-current players
  const { queueOrder: broadcastedQueue, hasQueueData } = useStationQueue({
    stationId,
    enabled: enableQueueOrdering && !isCurrentPlayer
  });

  // Function to order tracks based on a provided queue
  const orderTracksByQueue = useCallback((queueIds: string[], source: string) => {
    if (!tracks.length) return;

    // Create maps for track matching
    const tracksBySpotifyId = new Map<string, StationTrack>();
    const tracksByNameArtist = new Map<string, StationTrack>();
    
    tracks.forEach(track => {
      // Direct Spotify ID match (for enriched tracks)
      if (track.trackId && !track.trackId.startsWith("track-")) {
        tracksBySpotifyId.set(track.trackId, track);
      }
      
      // Name + Artist match (for ChartMasters tracks)
      if (track.name && track.artist) {
        const key = `${track.name.toLowerCase()}|${track.artist.toLowerCase()}`;
        tracksByNameArtist.set(key, track);
      }
    });

    // Order tracks based on queue
    const orderedTrackSet = new Set<string>();
    const newOrderedTracks: TrackWithQueueInfo[] = [];

    // Find currently playing track
    const currentlyPlayingTrack = tracks.find(track => isTrackCurrentlyPlaying(track));
    
    // For current player, also find the track that was last playing (even if not currently playing)
    // This helps us handle finished tracks correctly
    const lastPlayedTrack = isCurrentPlayer && !currentlyPlayingTrack ? 
      tracks.find(track => {
        // Check if this track matches the current track ID from playing state, even if not currently playing
        return redisPlayingState?.currentTrackId === track.id;
      }) : null;
    
    // The "active" track is either currently playing or the last played track
    const activeTrack = currentlyPlayingTrack || lastPlayedTrack;
    
    // Check if the active track (currently playing or last played) is in the queue
    const isActiveTrackInQueue = activeTrack && queueIds.length > 0 && queueIds.some(queueId => {
      const queueTrack = tracksBySpotifyId.get(queueId);
      return queueTrack?.id === activeTrack.id;
    });
    
    // Determine if active track should be at top:
    // - For members: always at top if there's an active track
    // - For current player with no queue: at top if currently playing
    // - For current player with queue: at top if currently playing OR if last played track is still in queue
    const shouldPutActiveTrackAtTop = activeTrack && (
      !isCurrentPlayer || // Members always see active track at top
      (queueIds.length === 0 && currentlyPlayingTrack) || // No queue + currently playing = top
      (queueIds.length > 0 && (currentlyPlayingTrack || isActiveTrackInQueue)) // With queue: top if playing or still queued
    );

    // Add active track at top if needed
    if (shouldPutActiveTrackAtTop && activeTrack) {
      newOrderedTracks.push(activeTrack);
      orderedTrackSet.add(activeTrack.id);
    }

    // Add tracks in queue order (excluding currently playing if already added)
    for (const spotifyId of queueIds) {
      let matchedTrack = tracksBySpotifyId.get(spotifyId);
      
      if (matchedTrack && !orderedTrackSet.has(matchedTrack.id)) {
        newOrderedTracks.push(matchedTrack);
        orderedTrackSet.add(matchedTrack.id);
      }
    }

    // Add remaining tracks that weren't in the queue
    const remainingTracks = tracks.filter(track => !orderedTrackSet.has(track.id));
    
    // For current player: if active track is not at top (finished and not in queue), add it at the end
    if (isCurrentPlayer && activeTrack && !shouldPutActiveTrackAtTop) {
      // Add other remaining tracks first, then active track at the end
      const otherRemainingTracks = remainingTracks.filter(track => track.id !== activeTrack.id);
      newOrderedTracks.push(...otherRemainingTracks);
      newOrderedTracks.push(activeTrack);
    } else {
      // Normal case: add all remaining tracks
      newOrderedTracks.push(...remainingTracks);
    }

    console.log(`📻 Queue ordering (${source}): Ordered ${newOrderedTracks.length} tracks (${orderedTrackSet.size} from queue, ${remainingTracks.length} remaining), active track at ${shouldPutActiveTrackAtTop ? 'top' : 'bottom'} for ${isCurrentPlayer ? 'current player' : 'member'}`);
    setOrderedTracks(newOrderedTracks);
    setQueueOrder(queueIds);
  }, [tracks, isTrackCurrentlyPlaying, isCurrentPlayer, redisPlayingState]);

  const fetchQueueAndReorder = useCallback(async () => {
    if (!spotify || !user || !isCurrentPlayer || !enableQueueOrdering || !tracks.length) {
      // If not the current player or no tracks, use chronological order
      // For non-current players, always put currently playing track at top
      // For current players without queue data, use simple chronological order (currently playing will be handled by queue logic)
      const chronologicalTracks = [...tracks];
      
      if (!isCurrentPlayer) {
        // For members: always put currently playing track at top
        const currentlyPlayingIndex = chronologicalTracks.findIndex(track => isTrackCurrentlyPlaying(track));
        if (currentlyPlayingIndex > 0) {
          const [currentlyPlayingTrack] = chronologicalTracks.splice(currentlyPlayingIndex, 1);
          chronologicalTracks.unshift(currentlyPlayingTrack);
        }
      }
      // For current players: use chronological order as-is, queue logic will handle positioning
      
      setOrderedTracks(chronologicalTracks);
      setQueueOrder([]);
      return;
    }

    try {
      // Get the current Spotify queue
      const queueData = await spotify.getUsersQueue();
      
      if (!queueData?.queue || queueData.queue.length === 0) {
        console.log("📻 Queue ordering: No queue data, using orderTracksByQueue with empty queue for current player");
        // Use the queue ordering function with empty queue - this will put finished tracks at bottom
        orderTracksByQueue([], 'No queue data');
        return;
      }

      // Extract track IDs from the queue in order
      const spotifyQueueIds = queueData.queue
        .filter(track => track.type === 'track')
        .map(track => track.id);

      // Use the helper function to order tracks
      orderTracksByQueue(spotifyQueueIds, 'Spotify API');

    } catch (error) {
      console.error("Error fetching queue for track ordering:", error);
      // Fallback: use empty queue ordering for current player (puts finished tracks at bottom)
      orderTracksByQueue([], 'Error fallback');
    }
  }, [spotify, user, isCurrentPlayer, enableQueueOrdering, tracks, isTrackCurrentlyPlaying]);

  // Handle broadcasted queue updates for non-current players
  useEffect(() => {
    if (!isCurrentPlayer && hasQueueData && broadcastedQueue.length > 0) {
      console.log(`📻 Queue ordering: Using broadcasted queue from current player`);
      orderTracksByQueue(broadcastedQueue, 'broadcast');
    }
  }, [isCurrentPlayer, hasQueueData, broadcastedQueue, orderTracksByQueue]);

  // Fetch queue when dependencies change (for current player)
  useEffect(() => {
    if (isCurrentPlayer) {
      fetchQueueAndReorder();
    }
  }, [fetchQueueAndReorder, isCurrentPlayer]);

  // Return tracks with queue position info
  const tracksWithQueueInfo = orderedTracks.map((track, index) => {
    const isInQueue = queueOrder.length > 0 && index < queueOrder.length;
    return {
      ...track,
      queuePosition: isInQueue ? index + 1 : null,
      isInQueue
    };
  });

  return {
    orderedTracks: tracksWithQueueInfo,
    isUsingQueueOrder: queueOrder.length > 0 && isCurrentPlayer,
    refreshQueueOrder: fetchQueueAndReorder
  };
};