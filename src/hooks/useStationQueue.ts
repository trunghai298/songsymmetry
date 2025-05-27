"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";

interface QueueState {
  queueOrder: string[];
  timestamp: number;
  playingUserId: string;
  playingUserName: string | null;
}

interface UseStationQueueOptions {
  stationId: string;
  enabled: boolean;
}

export const useStationQueue = ({ stationId, enabled }: UseStationQueueOptions) => {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const { subscribe } = useSocket();

  // Subscribe to queue updates
  useEffect(() => {
    if (!enabled || !stationId) return;

    console.log(`📻 Station Queue: Subscribing to queue updates for station ${stationId}`);

    const unsubscribe = subscribe("queue-update", (data: any) => {
      if (data.stationId === stationId) {
        console.log(`📻 Station Queue: Received queue update:`, data.queueOrder);
        setQueueState({
          queueOrder: data.queueOrder || [],
          timestamp: data.timestamp || Date.now(),
          playingUserId: data.playingUserId,
          playingUserName: data.playingUserName
        });
      }
    });

    return () => {
      console.log(`📻 Station Queue: Unsubscribing from queue updates for station ${stationId}`);
      unsubscribe();
    };
  }, [enabled, stationId, subscribe]);

  // Clear queue state when disabled
  useEffect(() => {
    if (!enabled) {
      setQueueState(null);
    }
  }, [enabled]);

  return {
    queueOrder: queueState?.queueOrder || [],
    hasQueueData: !!queueState && queueState.queueOrder.length > 0,
    playingUserId: queueState?.playingUserId,
    playingUserName: queueState?.playingUserName,
    timestamp: queueState?.timestamp
  };
};