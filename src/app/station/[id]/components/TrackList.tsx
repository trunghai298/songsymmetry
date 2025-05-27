"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StationTrack } from "@/hooks/useStationData";


interface TrackListProps {
  tracks: StationTrack[];
  isTrackCurrentlyPlaying: (track: StationTrack) => boolean;
  onPlayTrack: (track: StationTrack, index: number) => void;
  playingTrackId: string | null;
  formatDate: (dateString: string) => string;
  redisPlayingState?: {
    isPlaying: boolean;
    currentTrackId: string | null;
    currentSpotifyId: string | null;
    trackName?: string | null;
    trackArtist?: string | null;
    playingUserName?: string | null;
  } | null;
}

// Now Playing Panel Component
export interface NowPlayingPanelProps {
  redisPlayingState: TrackListProps['redisPlayingState'];
  currentTrack: StationTrack | null;
  formatDate: (dateString: string) => string;
}

export function NowPlayingPanel({ redisPlayingState, currentTrack, formatDate }: NowPlayingPanelProps) {
  // Show panel if there's any playing state (current or recent)
  const hasPlayingInfo = redisPlayingState?.currentTrackId || currentTrack;
  
  if (!hasPlayingInfo) {
    return null;
  }

  // Prefer Redis state info, fallback to track info
  const trackName = redisPlayingState?.trackName || currentTrack?.name || "Unknown Track";
  const trackArtist = redisPlayingState?.trackArtist || currentTrack?.artist || "Unknown Artist";
  const playerName = redisPlayingState?.playingUserName || "Someone";
  const isCurrentlyPlaying = redisPlayingState?.isPlaying || false;
  const trackImage = currentTrack?.imageUrl;

  return (
    <Card className="mb-4 p-4 bg-gradient-to-r from-gray-900/90 to-gray-800/90 border border-purple-500/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {/* Track Image */}
        {trackImage ? (
          <img
            src={trackImage}
            alt={trackName}
            className="w-16 h-16 rounded-lg shadow-lg flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
            <i className="bi bi-music-note-beamed text-2xl text-white"></i>
          </div>
        )}

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-2">
              {isCurrentlyPlaying ? (
                <>
                  <div className="flex items-end space-x-0.5" style={{ height: "20px" }}>
                    <div
                      className="w-1 bg-green-400 rounded-full"
                      style={{
                        height: "8px",
                        animation: "audioBar1 1.2s ease-in-out infinite",
                      }}
                    ></div>
                    <div
                      className="w-1 bg-green-400 rounded-full"
                      style={{
                        height: "16px",
                        animation: "audioBar2 1.5s ease-in-out infinite",
                      }}
                    ></div>
                    <div
                      className="w-1 bg-green-400 rounded-full"
                      style={{
                        height: "10px",
                        animation: "audioBar3 1.1s ease-in-out infinite",
                      }}
                    ></div>
                    <div
                      className="w-1 bg-green-400 rounded-full"
                      style={{
                        height: "18px",
                        animation: "audioBar4 1.3s ease-in-out infinite",
                      }}
                    ></div>
                  </div>
                  <Badge className="bg-green-500 text-white border-none px-2 py-1 text-xs">
                    NOW PLAYING
                  </Badge>
                </>
              ) : (
                <Badge variant="outline" className="border-gray-500 text-gray-400 px-2 py-1 text-xs">
                  LAST PLAYED
                </Badge>
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-white truncate">
            {trackName}
          </h3>
          <p className="text-sm text-gray-300 truncate">
            by {trackArtist}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Playing on {playerName}&apos;s Spotify
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCurrentlyPlaying ? (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          ) : (
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          )}
        </div>
      </div>
    </Card>
  );
}


export default function TrackList({
  tracks,
  isTrackCurrentlyPlaying,
  onPlayTrack,
  playingTrackId,
  formatDate,
  redisPlayingState,
}: TrackListProps) {
  // Find the current track for the Now Playing panel
  const currentTrack = tracks.find(track => 
    track.id === redisPlayingState?.currentTrackId ||
    isTrackCurrentlyPlaying(track)
  ) || null;

  // Use tracks in their original chronological order (no reordering)
  const orderedTracks = tracks;

  if (!tracks || tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
        <div className="w-24 h-24 bg-gray-800/70 rounded-full flex items-center justify-center mb-6 shadow-xl border border-gray-700 animate-float">
          <i className="bi bi-music-note-beamed text-5xl text-purple-400 animate-pulse-slow"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          No tracks in this station yet
        </h3>
        <p className="text-gray-500">
          Join this station to add tracks!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Track List */}
      <div className="space-y-2">
        {orderedTracks.map((track, index) => {

          return (
            <div
              key={track.id}
              className="flex items-start sm:items-center justify-between p-3 rounded-lg transition-all duration-200 group hover:shadow-md bg-gray-800/70 border border-transparent hover:bg-gray-700/90 hover:border-gray-700"
            >
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                {track.imageUrl && (
                  <img
                    src={track.imageUrl}
                    alt={track.name || "Track"}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded flex-shrink-0"
                  />
                )}
                {!track.imageUrl && (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-music-note text-purple-400"></i>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start sm:items-center gap-2 flex-wrap sm:flex-nowrap">
                    <p className="font-medium text-white text-sm sm:text-base leading-tight sm:truncate">
                      {track.name || "Unknown Track"}
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 leading-tight sm:truncate mt-1">
                    {track.artist || "Unknown Artist"}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-gray-500 flex-wrap sm:flex-nowrap">
                    <Avatar className="h-4 w-4 mr-1">
                      <AvatarImage src={track.addedBy?.image || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {track.addedBy?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="break-words">
                      <span className="sm:inline">Added by {track.addedBy?.name || "Unknown"}</span>
                      <span className="hidden sm:inline"> • </span>
                      <span className="block sm:inline text-gray-600 sm:text-gray-500">{formatDate(track.addedAt)}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-start sm:items-center space-x-1 flex-shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPlayTrack(track, index)}
                  disabled={playingTrackId === track.id}
                  className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 text-white group-hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-gray-700/50 hover:bg-purple-600"
                  title={`Play "${track.name}" and continue with station queue`}
                >
                  {playingTrackId === track.id ? (
                    <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                  ) : (
                    <i className="bi bi-play-fill text-sm sm:text-lg"></i>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}