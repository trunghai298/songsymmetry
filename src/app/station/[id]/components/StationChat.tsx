"use client";

import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useStationChat } from "@/hooks/useStationChat";
import { Send, MessageCircle } from "lucide-react";

interface StationChatProps {
  stationId: string;
  variant?: "floating" | "panel";
}

export default function StationChat({ stationId, variant = "floating" }: StationChatProps) {
  const { 
    messages, 
    typingUsers, 
    isConnected, 
    user,
    sendMessage,
    startTyping,
    stopTyping
  } = useStationChat(stationId);
  
  const [newMessage, setNewMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    sendMessage(newMessage.trim());
    setNewMessage("");
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping();
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (!user || !isConnected) return;

    // Start typing indicator
    if (value.trim()) {
      startTyping();
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    } else {
      stopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Panel variant - always expanded, no floating behavior
  if (variant === "panel") {
    return (
      <Card className="h-[500px] lg:h-[600px] flex flex-col bg-gray-900/95 backdrop-blur-md border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-700">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Station Chat</h3>
          {messages.length > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full ml-auto">
              {messages.length}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={`${msg.userId}-${msg.timestamp}-${index}`} className="flex gap-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-gray-700 text-gray-300">
                    {msg.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-blue-400 truncate">
                      {msg.userName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 break-words">{msg.message}</p>
                </div>
              </div>
            ))
          )}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="flex gap-2 text-gray-400 text-sm italic">
              <div className="w-6 h-6" /> {/* Spacer for avatar alignment */}
              <span>
                {typingUsers.map(u => u.userName).join(", ")} 
                {typingUsers.length === 1 ? " is" : " are"} typing...
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {user && (
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                disabled={!isConnected}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !isConnected}
                size="sm"
                className="px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {!isConnected && (
                <span className="text-xs text-red-400">Chat unavailable</span>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Floating variant (original behavior)
  if (!isExpanded) {
    return (
      <Card className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="default"
          size="lg"
          className="flex items-center gap-2 rounded-lg"
        >
          <MessageCircle className="w-5 h-5" />
          Station Chat
          {messages.length > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {messages.length}
            </span>
          )}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="fixed top-24 right-4 w-80 h-[calc(100vh-8rem)] max-h-[450px] z-50 flex flex-col bg-gray-900/95 backdrop-blur-md border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Station Chat</h3>
        </div>
        <Button
          onClick={() => setIsExpanded(false)}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          ×
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.userId}-${msg.timestamp}-${index}`} className="flex gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarFallback className="text-xs bg-gray-700 text-gray-300">
                  {msg.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-blue-400 truncate">
                    {msg.userName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-200 break-words">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex gap-2 text-gray-400 text-sm italic">
            <div className="w-6 h-6" /> {/* Spacer for avatar alignment */}
            <span>
              {typingUsers.map(u => u.userName).join(", ")} 
              {typingUsers.length === 1 ? " is" : " are"} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {user && (
        <div className="p-3 border-t border-gray-700">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              size="sm"
              className="px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {!isConnected && (
              <span className="text-xs text-red-400">Chat unavailable</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}