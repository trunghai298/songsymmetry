"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSpotify } from "@/hooks/useSpotify";
import { useStationChat } from "@/hooks/useStationChat";
import { useSocket } from "@/hooks/useSocket";
import { getAuthUser } from "@/lib/session";

interface QueueChatOptions {
  stationId: string;
  isCurrentPlayer: boolean;
  enableQueueChat: boolean;
}

export const useQueueChat = ({
  stationId,
  isCurrentPlayer,
  enableQueueChat,
}: QueueChatOptions) => {
  const { data: session } = useSession();
  const { client: spotify } = useSpotify();
  const { sendMessage } = useStationChat(stationId);
  const { emitEvent } = useSocket();

  const lastQueueTrackRef = useRef<string | null>(null);
  const lastQueueOrderRef = useRef<string[]>([]);
  const lastCheckTimeRef = useRef<number>(0);
  const user = getAuthUser(session);

  const checkQueueAndSendMessage = useCallback(async () => {
    // Debounce: Don't check more than once every 5 seconds
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 5000) {
      console.log("📻 Queue chat: Debounced - too soon since last check");
      return;
    }
    lastCheckTimeRef.current = now;

    if (!spotify || !user || !isCurrentPlayer || !enableQueueChat) {
      console.log("📻 Queue chat: Conditions not met", {
        spotify: !!spotify,
        user: !!user,
        isCurrentPlayer,
        enableQueueChat
      });
      return;
    }

    try {
      // Get the current queue
      const queueData = await spotify.getUsersQueue();

      if (!queueData?.queue || queueData.queue.length === 0) {
        console.log("📻 Queue chat: No queue data or empty queue");
        return;
      }

      // Extract all track IDs from the queue
      const queueTrackIds = queueData.queue
        .filter(track => track.type === 'track')
        .map(track => track.id);

      // Check if the queue order has changed
      const queueOrderChanged = JSON.stringify(queueTrackIds) !== JSON.stringify(lastQueueOrderRef.current);
      
      if (queueOrderChanged) {
        // Broadcast the full queue to all station members
        console.log("📻 Queue broadcast: Sending queue update to all members:", queueTrackIds);
        emitEvent('queue-update', {
          stationId,
          queueOrder: queueTrackIds,
          timestamp: Date.now(),
          playingUserId: user.id,
          playingUserName: user.name
        });
        
        lastQueueOrderRef.current = queueTrackIds;
      }

      // Get the next track in queue for chat announcement
      const nextTrack = queueData.queue[0];

      if (!nextTrack || nextTrack.type !== "track") {
        console.log("📻 Queue chat: No valid next track");
        return;
      }

      // Check if this is a different next track than we last announced
      const nextTrackId = nextTrack.id;
      if (lastQueueTrackRef.current === nextTrackId) {
        console.log("📻 Queue chat: Same track as last announcement, skipping");
        return;
      }

      // Format the track info
      const trackName = nextTrack.name;
      const artistName =
        "artists" in nextTrack ? nextTrack.artists[0]?.name : "Unknown Artist";

      const message = `🎵 Up next: "${trackName}" by ${artistName}`;
      
      console.log("📻 Queue chat: Attempting to send message:", message);
      
      // Always try to send the message since normal chat is working
      // The underlying sendMessage function will handle connection issues
      sendMessage(message);
      lastQueueTrackRef.current = nextTrackId;
      
      console.log(
        "📻 Queue chat: Announced next track:",
        trackName,
        "by",
        artistName
      );
    } catch (error) {
      console.error("Error checking queue for chat:", error);

      // Reset our reference on error so we can try again
      lastQueueTrackRef.current = null;
    }
  }, [spotify, user, isCurrentPlayer, enableQueueChat, sendMessage, stationId, emitEvent]);

  // Check queue when track changes (we'll trigger this manually)
  const announceNextTrack = useCallback(() => {
    if (isCurrentPlayer && enableQueueChat) {
      checkQueueAndSendMessage();
    }
  }, [isCurrentPlayer, enableQueueChat, checkQueueAndSendMessage]);

  // Reset queue reference when user is no longer the current player
  useEffect(() => {
    if (!isCurrentPlayer) {
      lastQueueTrackRef.current = null;
    }
  }, [isCurrentPlayer]);

  return {
    announceNextTrack,
    checkQueue: checkQueueAndSendMessage,
  };
};
