"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Initialize socket connection if it doesn't exist
    const initSocket = async () => {
      if (!socket) {
        try {
          console.log("Initializing socket connection...");

          console.log("Creating socket connection to custom server endpoint");

          // Create the socket connection - no prefetch needed
          // The server.js file is handling the socket setup
          socket = io("http://localhost:3000", {
            path: "/api/socketio", // Match the path in server.js
            addTrailingSlash: false,
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: true,
            forceNew: true,
            timeout: 20000, // 20 seconds timeout
          });

          socket.on("connect", () => {
            console.log("Socket connected with ID:", socket?.id);
            setIsConnected(true);
          });

          socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            setIsConnected(false);
          });

          socket.on("error", (err) => {
            console.error("Socket general error:", err);
          });

          socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
            setIsConnected(false);
          });

          socket.on("reconnect_attempt", (attempt) => {
            console.log(`Socket reconnect attempt ${attempt}`);
          });

          socket.on("reconnect", (attempt) => {
            console.log(`Socket reconnected after ${attempt} attempts`);
            setIsConnected(true);
          });

          // Attempt to connect
          if (!socket.connected) {
            socket.connect();
          }
        } catch (err) {
          console.error("Failed to initialize socket:", err);
        }
      }
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log("Cleaning up socket connection");
        // Remove all listeners to prevent memory leaks
        socket.removeAllListeners();
        // Disconnect
        socket.disconnect();
      }
    };
  }, []);

  // Function to join a station
  const joinStation = (stationId: string, userId: string) => {
    console.log(
      `Joining station ${stationId} for user ${userId}`,
      socket,
      isConnected
    );
    if (socket && isConnected) {
      console.log(`[Socket] Joining station ${stationId} for user ${userId}`);
      // Use a callback to confirm emission
      socket.emit("join-station", stationId, userId, () => {
        console.log(
          `[Socket] Server acknowledged join for station ${stationId}`
        );
      });
    } else {
      console.warn(
        `[Socket] Cannot join station ${stationId}: Socket not connected (isConnected: ${isConnected})`
      );
      // Attempt to connect if socket exists but not connected
      if (socket && !isConnected) {
        console.log(`[Socket] Attempting to reconnect socket`);
        socket.connect();
      }
    }
  };

  // Function to leave a station
  const leaveStation = (stationId: string, userId: string) => {
    if (socket && isConnected) {
      console.log(`[Socket] Leaving station ${stationId} for user ${userId}`);
      socket.emit("leave-station", stationId, userId, () => {
        console.log(
          `[Socket] Server acknowledged leave for station ${stationId}`
        );
      });
    } else {
      console.warn(
        `[Socket] Cannot leave station ${stationId}: Socket not connected (isConnected: ${isConnected})`
      );
    }
  };

  // Function to add a track to a station
  const addTrack = (stationId: string, userId: string, track: any) => {
    if (socket && isConnected) {
      console.log(`Adding track to station ${stationId} by user ${userId}`);
      socket.emit("add-track", { stationId, userId, track });
    } else {
      console.warn(
        `Cannot add track to station ${stationId}: Socket not connected`
      );
      // Attempt to connect if socket exists but not connected
      if (socket && !isConnected) {
        socket.connect();
      }
    }
  };

  // Function to update playback state
  const updatePlayback = (stationId: string, userId: string, state: any) => {
    if (socket && isConnected) {
      console.log(`Updating playback for station ${stationId}`);
      socket.emit("playback-update", { stationId, userId, state });
    } else {
      console.warn(
        `Cannot update playback for station ${stationId}: Socket not connected`
      );
    }
  };

  // Function to subscribe to events
  const subscribe = (event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      console.log(`[Socket] Subscribing to event: ${event}`);

      // Remove any existing listeners for this event to prevent duplicates
      socket.off(event);

      // Add the new listener
      socket.on(event, (...args) => {
        console.log(`[Socket] Received event: ${event}`, JSON.stringify(args));

        // Try-catch to protect from callback errors
        try {
          callback(...args);
        } catch (error) {
          console.error(`[Socket] Error in event ${event} callback:`, error);
        }
      });
    } else {
      console.warn(
        `[Socket] Cannot subscribe to event ${event}: Socket not initialized`
      );
    }

    // Return unsubscribe function
    return () => {
      if (socket) {
        console.log(`[Socket] Unsubscribing from event: ${event}`);
        socket.off(event);
      }
    };
  };

  return {
    isConnected,
    joinStation,
    leaveStation,
    addTrack,
    updatePlayback,
    subscribe,
    socket,
  };
};
