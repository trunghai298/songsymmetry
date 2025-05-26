"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// Global socket instance to ensure single connection
let globalSocket: Socket | null = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState<boolean>(
    globalSocket?.connected || false
  );
  const socketRef = useRef<Socket | null>(globalSocket);

  useEffect(() => {
    // Check if we already have a connected socket
    if (globalSocket?.connected) {
      setIsConnected(true);
      socketRef.current = globalSocket;
      return;
    }

    // Initialize socket connection if it doesn't exist
    const initSocket = async () => {
      // Clean up any existing socket first
      if (globalSocket) {
        console.log("🧹 Cleaning up existing socket before creating new one");
        globalSocket.removeAllListeners();
        globalSocket.disconnect();
        globalSocket = null;
      }

      if (!globalSocket) {
        try {
          console.log("🔌 Initializing socket connection...");

          // Create the socket connection - no prefetch needed
          // The server.js file is handling the socket setup
          const socketUrl =
            process.env.NODE_ENV === "production"
              ? window.location.origin
              : "http://localhost:3000";

          console.log(
            `🔌 Connecting to: ${socketUrl} with path: /api/socketio`
          );

          globalSocket = io(socketUrl, {
            path: "/api/socketio",
            transports: ["polling"],
            autoConnect: true, // Let Socket.IO handle connection timing
            timeout: 20000,
          });

          socketRef.current = globalSocket;

          // Expose global socket for direct access (debugging/advanced use)
          (window as any).__globalSocket = globalSocket;

          console.log("🔌 Socket instance created, attempting connection...");

          // Add a connection timeout that forces reconnection
          const connectionTimeout = setTimeout(() => {
            if (!globalSocket?.connected) {
              console.error(
                "❌ Socket connection timeout after 10 seconds, forcing disconnect/reconnect"
              );
              globalSocket?.disconnect();
              setIsConnected(false);

              // Try reconnecting after a short delay
              setTimeout(() => {
                console.log("🔄 Attempting reconnection...");
                globalSocket?.connect();
              }, 1000);
            }
          }, 10000);

          // Engine-level debugging
          globalSocket.io.on("open", () => {
            console.log("🔓 Socket.IO engine opened");
          });

          globalSocket.io.on("close", (reason) => {
            console.log("🔒 Socket.IO engine closed:", reason);
          });

          globalSocket.io.on("error", (error) => {
            console.error("⚠️ Socket.IO engine error:", error);
          });

          globalSocket.on("connect", () => {
            console.log("✅ Socket connected with ID:", globalSocket?.id);
            console.log(
              "✅ Transport used:",
              globalSocket?.io?.engine?.transport?.name
            );
            console.log(
              "✅ Engine ready state:",
              globalSocket?.io?.engine?.readyState
            );
            clearTimeout(connectionTimeout);
            console.log("🔄 Setting isConnected to TRUE");
            setIsConnected(true);
          });

          // globalSocket.on("connect_error", (err) => {
          //   console.error("❌ Socket connection error:", err);
          //   console.error(
          //     "❌ Error details:",
          //     err.message,
          //     err.type,
          //     err.description
          //   );
          //   console.error(
          //     "❌ Engine state:",
          //     globalSocket?.io?.engine?.readyState
          //   );
          //   clearTimeout(connectionTimeout);
          //   setIsConnected(false);
          // });

          globalSocket.on("error", (err) => {
            console.error("❌ Socket general error:", err);
          });

          globalSocket.on("disconnect", (reason) => {
            console.log("🔌 Socket disconnected:", reason);
            console.log("🔄 Setting isConnected to FALSE");
            setIsConnected(false);
          });

          globalSocket.on("reconnect_attempt", (attempt) => {
            console.log(`🔄 Socket reconnect attempt ${attempt}`);
          });

          globalSocket.on("reconnect", (attempt) => {
            console.log(`✅ Socket reconnected after ${attempt} attempts`);
            setIsConnected(true);
          });

          // With autoConnect: true, connection starts automatically
          console.log("🔌 Auto-connection starting...");
          console.log("🔌 Initial state:", {
            connected: globalSocket.connected,
            disconnected: globalSocket.disconnected,
            engineState: globalSocket.io?.engine?.readyState,
          });

          // Check state after connection attempt
          setTimeout(() => {
            console.log("🔌 State after 3 seconds:", {
              connected: globalSocket?.connected,
              disconnected: globalSocket?.disconnected,
              engineState: globalSocket?.io?.engine?.readyState,
            });
          }, 3000);
        } catch (err) {
          console.error("Failed to initialize socket:", err);
        }
      }
    };

    initSocket();

    // Update ref to current global socket
    socketRef.current = globalSocket;

    // Don't cleanup global socket on unmount as it may be used by other components
    return () => {
      // We keep the global socket alive for other components
    };
  }, []);

  // Function to join a station - memoized to prevent re-renders
  const joinStation = useCallback(
    (stationId: string, userId: string) => {
      const socket = socketRef.current;
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
    },
    [isConnected]
  );

  // Function to leave a station - memoized to prevent re-renders
  const leaveStation = useCallback(
    (stationId: string, userId: string) => {
      const socket = socketRef.current;
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
    },
    [isConnected]
  );

  // Function to add a track to a station - memoized to prevent re-renders
  const addTrack = useCallback(
    (stationId: string, userId: string, track: any) => {
      const socket = socketRef.current;
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
    },
    [isConnected]
  );

  // Function to update playback state
  const updatePlayback = (stationId: string, userId: string, state: any) => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      console.log(`Updating playback for station ${stationId}`);
      socket.emit("playback-update", { stationId, userId, state });
    } else {
      console.warn(
        `Cannot update playback for station ${stationId}: Socket not connected`
      );
    }
  };

  // Function to remove a track from station
  const removeTrack = (stationId: string, userId: string, trackId: string) => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      console.log(`Removing track ${trackId} from station ${stationId}`);
      socket.emit("remove-track", { stationId, userId, trackId });
    } else {
      console.warn(
        `Cannot remove track from station ${stationId}: Socket not connected`
      );
    }
  };

  // Function to update station settings
  const updateStation = (stationId: string, userId: string, updates: any) => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      console.log(`Updating station ${stationId} settings`);
      socket.emit("station-update", { stationId, userId, updates });
    } else {
      console.warn(`Cannot update station ${stationId}: Socket not connected`);
    }
  };

  // Function to send chat message
  const sendMessage = (
    stationId: string,
    userId: string,
    userName: string,
    message: string
  ) => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      console.log(`📤 useSocket: Sending message to station ${stationId}:`, {
        stationId,
        userId,
        userName,
        message,
      });
      socket.emit("send-message", { stationId, userId, userName, message });
      console.log(`✅ useSocket: Message emitted successfully`);
    } else {
      console.warn(
        `🚫 useSocket: Cannot send message to station ${stationId}: Socket not connected (isConnected: ${isConnected})`
      );
    }
  };

  // Function to indicate typing
  const startTyping = (stationId: string, userId: string, userName: string) => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      socket.emit("typing-start", { stationId, userId, userName });
    }
  };

  const stopTyping = (stationId: string, userId: string) => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      socket.emit("typing-stop", { stationId, userId });
    }
  };

  // Function to vote on tracks
  const voteTrack = (
    stationId: string,
    userId: string,
    trackId: string,
    vote: "up" | "down"
  ) => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      console.log(`Voting ${vote} on track ${trackId} in station ${stationId}`);
      socket.emit("vote-track", { stationId, userId, trackId, vote });
    } else {
      console.warn(
        `Cannot vote on track in station ${stationId}: Socket not connected`
      );
    }
  };

  // Function to reorder queue
  const reorderQueue = (
    stationId: string,
    userId: string,
    trackOrder: string[]
  ) => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      console.log(`Reordering queue in station ${stationId}`);
      socket.emit("reorder-queue", { stationId, userId, trackOrder });
    } else {
      console.warn(
        `Cannot reorder queue in station ${stationId}: Socket not connected`
      );
    }
  };

  // Function to subscribe to events - memoized to prevent re-renders
  const subscribe = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      const socket = socketRef.current;
      if (socket) {
        console.log(`[Socket] Subscribing to event: ${event}`);

        // Create a wrapped callback to identify this specific listener
        const wrappedCallback = (...args: any[]) => {
          console.log(
            `[Socket] Received event: ${event}`,
            JSON.stringify(args)
          );

          // Try-catch to protect from callback errors
          try {
            callback(...args);
          } catch (error) {
            console.error(`[Socket] Error in event ${event} callback:`, error);
          }
        };

        // Add the new listener (without removing existing ones)
        socket.on(event, wrappedCallback);

        // Return unsubscribe function that removes only this specific listener
        return () => {
          const socket = socketRef.current;
          if (socket) {
            console.log(`[Socket] Unsubscribing from event: ${event}`);
            socket.off(event, wrappedCallback);
          }
        };
      } else {
        console.warn(
          `[Socket] Cannot subscribe to event ${event}: Socket not initialized`
        );
        return () => {}; // Return empty cleanup function
      }
    },
    []
  ); // Empty dependency array since socketRef.current is accessed inside

  return {
    isConnected,
    joinStation,
    leaveStation,
    addTrack,
    removeTrack,
    updatePlayback,
    updateStation,
    sendMessage,
    startTyping,
    stopTyping,
    voteTrack,
    reorderQueue,
    subscribe,
    socket: socketRef.current,
  };
};
