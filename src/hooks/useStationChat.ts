"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { getAuthUser } from "@/lib/session";

interface Message {
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  isTyping: boolean;
}

// Create a simple global state manager
class ChatState {
  private messages: Message[] = [];
  private typingUsers: TypingUser[] = [];
  private listeners: Set<() => void> = new Set();
  private hasSocketSubscription = false;

  addMessage(message: Message) {
    this.messages = [...this.messages, message];
    this.notifyListeners();
  }

  updateTyping(user: TypingUser) {
    const filtered = this.typingUsers.filter((u) => u.userId !== user.userId);
    if (user.isTyping) {
      this.typingUsers = [...filtered, user];
    } else {
      this.typingUsers = filtered;
    }
    this.notifyListeners();
  }

  getMessages() {
    return this.messages;
  }

  getTypingUsers() {
    return this.typingUsers;
  }

  addListener(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  setHasSocketSubscription(has: boolean) {
    this.hasSocketSubscription = has;
  }

  getHasSocketSubscription() {
    return this.hasSocketSubscription;
  }
}

// Global chat state instance
const globalChatState = new ChatState();

export const useStationChat = (stationId: string) => {
  const { data: session } = useSession();
  const { isConnected, sendMessage, startTyping, stopTyping, subscribe } =
    useSocket();

  const [, forceUpdate] = useState({});
  const user = getAuthUser(session);

  // Force re-render when global state changes
  useEffect(() => {
    const unsubscribe = globalChatState.addListener(() => {
      // Use a more efficient update mechanism without logging
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  // Subscribe to socket events - only once globally
  useEffect(() => {
    if (!isConnected || !user) {
      console.log(
        `🚫 useStationChat: Not subscribing - connected: ${isConnected}, user: ${!!user}`
      );
      return;
    }

    // Only subscribe if no other instance has subscribed yet
    if (globalChatState.getHasSocketSubscription()) {
      return;
    }

    globalChatState.setHasSocketSubscription(true);

    const unsubscribeMessage = subscribe("new-message", (data: Message) => {
      if (
        !data ||
        !data.userId ||
        !data.userName ||
        !data.message ||
        !data.timestamp
      ) {
        console.error(`❌ useStationChat: Invalid message data:`, data);
        return;
      }

      globalChatState.addMessage(data);
    });

    const unsubscribeTyping = subscribe("user-typing", (data: TypingUser) => {
      globalChatState.updateTyping(data);
    });

    return () => {
      globalChatState.setHasSocketSubscription(false);
      unsubscribeMessage();
      unsubscribeTyping();
    };
  }, [isConnected, user, subscribe, stationId]);

  const handleSendMessage = useCallback(
    (message: string) => {
      if (!message.trim() || !user || !isConnected) {
        console.log(
          `🚫 useStationChat: Cannot send message - message: "${message.trim()}", user: ${!!user}, isConnected: ${isConnected}`
        );
        return;
      }

      sendMessage(stationId, user.id, user.name || "Anonymous", message.trim());
    },
    [stationId, user, isConnected, sendMessage]
  );

  const handleStartTyping = useCallback(() => {
    if (!user || !isConnected) return;
    startTyping(stationId, user.id, user.name || "Anonymous");
  }, [stationId, user, isConnected, startTyping]);

  const handleStopTyping = useCallback(() => {
    if (!user || !isConnected) return;
    stopTyping(stationId, user.id);
  }, [stationId, user, isConnected, stopTyping]);

  return {
    messages: globalChatState.getMessages(),
    typingUsers: globalChatState.getTypingUsers(),
    isConnected,
    user,
    sendMessage: handleSendMessage,
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
  };
};
