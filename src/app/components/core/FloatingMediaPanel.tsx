"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Music, 
  Shuffle, 
  Plus, 
  List, 
  ChevronUp, 
  ChevronDown, 
  X,
  Minimize2,
  Maximize2
} from "lucide-react";
import { usePlayer } from "@/hooks/usePlayer";
import { useSpotify } from "@/hooks/useSpotify";
import { useSpotifySearch } from "@/hooks/useSpotifySearch";
import { toast } from "@/hooks/use-toast";

export default function FloatingMediaPanel() {
  const { 
    track: currentPlayingTrack,
    autoPlay, 
    toggleAutoPlay, 
    queue,
    // Spotify Web API controls
    startPlayback,
    pausePlayback,
    skipToNextTrack,
    skipToPreviousTrack,
    getCurrentPlaybackState,
    // Real playback state
    spotifyPlaybackState,
    isPlaying,
    currentProgress
  } = usePlayer();
  
  const { client: spotify } = useSpotify();
  const { searchTrack } = useSpotifySearch();
  
  // Panel states
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // Start hidden
  const [userClosed, setUserClosed] = useState(false); // Track if user manually closed
  
  // Drag states
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 336 : 16, // Default bottom-right
    y: typeof window !== 'undefined' ? window.innerHeight - 216 : 16 
  });
  const [hasDragged, setHasDragged] = useState(false);
  
  // Media control states
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Show panel when a song starts playing (only if user hasn't manually closed it)
  React.useEffect(() => {
    if (spotifyPlaybackState?.item && (isPlaying || spotifyPlaybackState?.is_playing)) {
      // Only show if user hasn't manually closed the panel
      if (!userClosed) {
        setIsVisible(true);
        
        // If there's a track in Redux store that matches current Spotify track, show expanded
        // Otherwise, show minimized for external Spotify playback
        if (currentPlayingTrack?.id === spotifyPlaybackState.item.id) {
          setIsMinimized(false);
        } else {
          setIsMinimized(true);
        }
      }
    }
  }, [spotifyPlaybackState?.item, isPlaying, spotifyPlaybackState?.is_playing, currentPlayingTrack, userClosed]);

  // Reset userClosed when a new track starts (different track ID)
  React.useEffect(() => {
    if (spotifyPlaybackState?.item?.id !== currentPlayingTrack?.id && spotifyPlaybackState?.item) {
      setUserClosed(false);
    }
  }, [spotifyPlaybackState?.item?.id, currentPlayingTrack?.id]);

  // Format time in mm:ss
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if clicking on the header area (not buttons)
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    setIsDragging(true);
    setHasDragged(false);
    
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    setHasDragged(true);
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Get panel dimensions
    const panelWidth = isMinimized ? 64 : isExpanded ? 384 : 320;
    const panelHeight = isMinimized ? 64 : 250;
    
    // Keep panel within viewport bounds
    const constrainedX = Math.max(0, Math.min(newX, window.innerWidth - panelWidth));
    const constrainedY = Math.max(0, Math.min(newY, window.innerHeight - panelHeight));
    
    setPosition({
      x: constrainedX,
      y: constrainedY
    });
  }, [isDragging, dragOffset, isMinimized, isExpanded]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click events to check it
    setTimeout(() => setHasDragged(false), 100);
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Get available devices
  const getAvailableDevices = async () => {
    try {
      if (!spotify) return [];
      const devices = await spotify.getAvailableDevices();
      return devices.devices || [];
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    try {
      const devices = await getAvailableDevices();
      if (devices.length === 0) {
        toast({
          title: "No Active Device",
          description: "Please open Spotify on a device first",
          variant: "destructive",
        });
        return;
      }

      if (isPlaying) {
        await pausePlayback();
      } else {
        await startPlayback();
      }
    } catch (error: any) {
      console.error('Error toggling playback:', error);
      
      // Only show error toasts for genuine errors, not API quirks
      const isGenuineError = error?.status === 404 || 
                            error?.status === 403 || 
                            error?.message?.includes('NO_ACTIVE_DEVICE') ||
                            error?.message?.includes('PREMIUM_REQUIRED') ||
                            error?.message?.includes('DEVICE_NOT_CONTROLLABLE');
      
      if (isGenuineError) {
        let errorMessage = "Could not control playback";
        if (error?.message?.includes('NO_ACTIVE_DEVICE') || error?.status === 404) {
          errorMessage = "No active Spotify device found. Please open Spotify.";
        } else if (error?.message?.includes('PREMIUM_REQUIRED') || error?.status === 403) {
          errorMessage = "Spotify Premium is required for playback control";
        } else if (error?.message?.includes('DEVICE_NOT_CONTROLLABLE')) {
          errorMessage = "Current device cannot be controlled. Try switching devices.";
        }
        
        toast({
          title: "Playback Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      // For other errors, just log them but don't show toast (playback might still work)
    }
  };

  // Create playlist from current search results
  const createPlaylistFromResults = async () => {
    if (!spotify || !playlistName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a playlist name",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingPlaylist(true);
    try {
      const userProfile = await spotify.getCurrentUserProfile();
      const playlist = await spotify.createPlaylist(userProfile.id, {
        name: playlistName,
        description: `Created from Song Symmetry`,
        public: false
      });

      toast({
        title: "Success!",
        description: `Created playlist "${playlistName}"`,
      });
      
      setShowPlaylistDialog(false);
      setPlaylistName("");
    } catch (error) {
      console.error("Error creating playlist:", error);
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Media Panel */}
      <div 
        className={`fixed z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
          isMinimized ? 'w-16 h-16' : isExpanded ? 'w-96 h-auto' : 'w-80 h-auto'
        } ${isDragging ? 'cursor-grabbing select-none' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transition: isDragging ? 'none' : 'all 0.3s ease'
        }}
      >
        {/* Minimized View */}
        {isMinimized && (
          <div 
            className={`w-full h-full flex items-center justify-center hover:bg-gray-800 rounded-lg transition-colors relative overflow-hidden select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasDragged) {
                setIsMinimized(false);
              }
            }}
          >
            {spotifyPlaybackState?.item?.type === 'track' && spotifyPlaybackState?.item?.album?.images?.[0]?.url ? (
              <div className="relative w-full h-full">
                <img 
                  src={spotifyPlaybackState.item.album.images[0].url} 
                  alt={spotifyPlaybackState.item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="flex space-x-1">
                      <div className="w-1 h-2 bg-white animate-pulse"></div>
                      <div className="w-1 h-3 bg-white animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-2 bg-white animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                {isPlaying ? (
                  <div className="w-6 h-6 flex items-center justify-center">
                    <div className="flex space-x-1">
                      <div className="w-1 h-4 bg-green-500 animate-pulse"></div>
                      <div className="w-1 h-3 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                ) : (
                  <Music className="w-6 h-6 text-gray-400" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Normal/Expanded View */}
        {!isMinimized && (
          <div className="p-4">
            {/* Header Controls */}
            <div 
              className={`flex items-center justify-between mb-3 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
              onMouseDown={(e) => {
                // Only allow drag from empty header areas, not buttons
                if (!(e.target as HTMLElement).closest('button')) {
                  handleMouseDown(e);
                }
              }}
            >
              <div className="flex items-center space-x-2">
                <Music className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">Now Playing</span>
                {/* Drag indicator dots */}
                <div className="flex space-x-1 ml-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsVisible(false);
                    setUserClosed(true);
                  }}
                  className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Now Playing Info */}
            {(spotifyPlaybackState?.item || currentPlayingTrack) && (
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                  {(spotifyPlaybackState?.item?.album?.images?.[0]?.url || currentPlayingTrack?.album?.images?.[0]?.url) ? (
                    <img 
                      src={spotifyPlaybackState?.item?.album?.images?.[0]?.url || currentPlayingTrack?.album?.images?.[0]?.url} 
                      alt="Album" 
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <Music className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {spotifyPlaybackState?.item?.name || currentPlayingTrack?.name}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {spotifyPlaybackState?.item?.artists?.[0]?.name || currentPlayingTrack?.artists?.[0]?.name}
                  </p>
                  {isPlaying && (
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-500 text-xs">Playing</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {(spotifyPlaybackState?.item || currentPlayingTrack) && (
              <div className="space-y-1 mb-3">
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-green-500 h-1 rounded-full transition-all duration-1000"
                    style={{
                      width: (spotifyPlaybackState?.item?.duration_ms || currentPlayingTrack?.duration_ms) 
                        ? `${Math.min((currentProgress / (spotifyPlaybackState?.item?.duration_ms || currentPlayingTrack?.duration_ms || 1)) * 100, 100)}%`
                        : '0%'
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{formatTime(currentProgress)}</span>
                  <span>{(spotifyPlaybackState?.item?.duration_ms || currentPlayingTrack?.duration_ms) ? formatTime(spotifyPlaybackState?.item?.duration_ms || currentPlayingTrack?.duration_ms || 0) : '--:--'}</span>
                </div>
              </div>
            )}

            {/* Playback Controls */}
            <div className="flex items-center justify-center space-x-4 mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await skipToPreviousTrack();
                  } catch (error: any) {
                    console.error('Skip previous error:', error);
                    // Only show error for genuine failures
                    if (error?.status === 404 || error?.status === 403) {
                      toast({
                        title: "Skip Error",
                        description: "Could not skip to previous track",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-700 w-8 h-8 p-0"
                disabled={!spotify}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className={`${isPlaying ? 'text-green-500 hover:text-green-400' : 'text-gray-400 hover:text-white'} hover:bg-gray-700 w-10 h-10 p-0`}
                disabled={!spotify}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await skipToNextTrack();
                  } catch (error: any) {
                    console.error('Skip next error:', error);
                    // Only show error for genuine failures
                    if (error?.status === 404 || error?.status === 403) {
                      toast({
                        title: "Skip Error",
                        description: "Could not skip to next track",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-700 w-8 h-8 p-0"
                disabled={!spotify}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Expanded Controls */}
            {isExpanded && (
              <div className="space-y-3 pt-3 border-t border-gray-700">
                {/* Auto-play Toggle */}
                <Button
                  variant={autoPlay ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAutoPlay}
                  className={`w-full text-xs ${
                    autoPlay 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-transparent border-gray-500 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <Shuffle className="w-3 h-3 mr-1" />
                  Auto-play {autoPlay ? "ON" : "OFF"}
                </Button>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPlaylistDialog(true)}
                    className="flex-1 bg-transparent border-gray-500 text-gray-300 hover:bg-gray-800 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Playlist
                  </Button>
                </div>
                
                {/* Queue Info */}
                {queue.length > 0 && (
                  <div className="text-xs text-gray-400 text-center">
                    Queue: {queue.length} tracks
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playlist Creation Dialog */}
      <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter playlist name"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowPlaylistDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={createPlaylistFromResults}
                disabled={!playlistName.trim() || isCreatingPlaylist}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isCreatingPlaylist ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}