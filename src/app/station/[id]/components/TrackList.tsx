"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StationTrack } from "@/hooks/useStationData";

interface TrackListProps {
  tracks: StationTrack[];
  isTrackCurrentlyPlaying: (track: StationTrack) => boolean;
  onPlayTrack: (track: StationTrack, index: number) => void;
  playingTrackId: string | null;
  debugShowAnimation: boolean;
  formatDate: (dateString: string) => string;
}

// Function to reorder tracks with currently playing track at the top
const getOrderedTracks = (
  tracks: StationTrack[],
  isTrackCurrentlyPlaying: (track: StationTrack) => boolean
): StationTrack[] => {
  if (!tracks || tracks.length === 0) return [];

  const playingTrackIndex = tracks.findIndex((track) =>
    isTrackCurrentlyPlaying(track)
  );

  if (playingTrackIndex === -1) {
    // No currently playing track, return original order
    return tracks;
  }

  // Move playing track to the top
  const playingTrack = tracks[playingTrackIndex];
  const otherTracks = tracks.filter(
    (_, index) => index !== playingTrackIndex
  );

  return [playingTrack, ...otherTracks];
};

export default function TrackList({
  tracks,
  isTrackCurrentlyPlaying,
  onPlayTrack,
  playingTrackId,
  debugShowAnimation,
  formatDate,
}: TrackListProps) {
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
    <div className="space-y-2">
      {getOrderedTracks(tracks, isTrackCurrentlyPlaying).map((track, index) => {
        // Get the original index for the play function
        const originalIndex = tracks.findIndex((t) => t.id === track.id);
        const isCurrentlyPlaying = isTrackCurrentlyPlaying(track);

        return (
          <div
            key={track.id}
            className={`flex items-start sm:items-center justify-between p-3 rounded-lg transition-all duration-200 group hover:shadow-md ${
              isCurrentlyPlaying || (debugShowAnimation && index === 0)
                ? "bg-green-500/10 border border-green-500/30 hover:bg-green-500/15"
                : "bg-gray-800/70 border border-transparent hover:bg-gray-700/90 hover:border-gray-700"
            }`}
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
                  {(isCurrentlyPlaying || (debugShowAnimation && index === 0)) && (
                    <div className="flex items-center gap-1 text-green-400">
                      <div
                        className="flex items-end space-x-0.5"
                        style={{ height: "16px" }}
                      >
                        <div
                          className="w-1 bg-green-400 rounded-full"
                          style={{
                            height: "6px",
                            animation: "audioBar1 1.2s ease-in-out infinite",
                          }}
                        ></div>
                        <div
                          className="w-1 bg-green-400 rounded-full"
                          style={{
                            height: "12px",
                            animation: "audioBar2 1.5s ease-in-out infinite",
                          }}
                        ></div>
                        <div
                          className="w-1 bg-green-400 rounded-full"
                          style={{
                            height: "8px",
                            animation: "audioBar3 1.1s ease-in-out infinite",
                          }}
                        ></div>
                        <div
                          className="w-1 bg-green-400 rounded-full"
                          style={{
                            height: "14px",
                            animation: "audioBar4 1.3s ease-in-out infinite",
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
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
                onClick={() => onPlayTrack(track, originalIndex)}
                disabled={playingTrackId === track.id}
                className={`rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 text-white group-hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  isCurrentlyPlaying || (debugShowAnimation && index === 0)
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-700/50 hover:bg-green-600"
                }`}
                title={
                  isCurrentlyPlaying
                    ? `"${track.name}" is currently playing`
                    : `Play "${track.name}" and continue with station queue`
                }
              >
                {playingTrackId === track.id ? (
                  <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                ) : isCurrentlyPlaying || (debugShowAnimation && index === 0) ? (
                  <i className="bi bi-pause-fill text-sm sm:text-lg"></i>
                ) : (
                  <i className="bi bi-play-fill text-sm sm:text-lg"></i>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}