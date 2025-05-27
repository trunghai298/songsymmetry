"use client";

import React, { useEffect, useState, useCallback } from "react";
import Container from "../components/core/Container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Crown, Globe, Shuffle, Users, Music, Play, Pause, Plus } from "lucide-react";

interface Station {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  playlistId: string | null;
  isSystem?: boolean;
  stationType?: string;
  isPlaying?: boolean;
  currentTrackId?: string | null;
  currentSpotifyId?: string | null;
  playingStartedAt?: string | null;
  lastActivityAt?: string | null;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  playingUser?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  _count: {
    members: number;
    tracks: number;
  };
  currentTrack?: {
    id: string;
    trackId: string;
    name: string;
    artist: string;
    imageUrl: string | null;
    addedAt: string;
  } | null;
  tracks: any[];
}

export default function StationPage() {
  const { data: session } = useSession();
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializingSystem, setIsInitializingSystem] = useState(false);
  const [isCreatingStation, setIsCreatingStation] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newStationName, setNewStationName] = useState("");
  const [newStationDescription, setNewStationDescription] = useState("");
  const [newStationPlaylistId, setNewStationPlaylistId] = useState("");
  const { toast } = useToast();

  // Helper function to extract playlist ID from Spotify URL or return as-is if already an ID
  const extractPlaylistId = (input: string): string => {
    if (!input.trim()) return "";
    
    const trimmed = input.trim();
    
    // Check if it's a Spotify URL
    const spotifyUrlMatch = trimmed.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if (spotifyUrlMatch) {
      return spotifyUrlMatch[1];
    }
    
    // Check if it's a spotify: URI
    const spotifyUriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (spotifyUriMatch) {
      return spotifyUriMatch[1];
    }
    
    // Assume it's already a playlist ID
    return trimmed;
  };

  const fetchStations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stations");
      const data = await response.json();
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
      toast({
        title: "Error",
        description: "Failed to load stations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const initializeSystemStations = async () => {
    setIsInitializingSystem(true);
    try {
      const response = await fetch("/api/stations/system/init", {
        method: "POST",
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "System Stations Initialized",
          description: `Successfully created ${data.summary.successful} system stations`,
        });
        fetchStations();
      } else {
        throw new Error(data.error || "Failed to initialize system stations");
      }
    } catch (error) {
      console.error("Error initializing system stations:", error);
      toast({
        title: "Error",
        description: "Failed to initialize system stations",
        variant: "destructive",
      });
    } finally {
      setIsInitializingSystem(false);
    }
  };

  const createStation = async () => {
    if (!newStationName.trim()) {
      toast({
        title: "Error",
        description: "Station name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingStation(true);
    try {
      const extractedPlaylistId = extractPlaylistId(newStationPlaylistId);
      
      const response = await fetch("/api/stations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newStationName.trim(),
          description: newStationDescription.trim() || null,
          playlistId: extractedPlaylistId || null,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const importResults = data.importResults;
        const description = importResults?.imported 
          ? `Successfully created "${newStationName}" station and imported ${importResults.success} tracks from playlist`
          : `Successfully created "${newStationName}" station`;
        
        toast({
          title: "Station Created",
          description,
        });
        setShowCreateDialog(false);
        setNewStationName("");
        setNewStationDescription("");
        setNewStationPlaylistId("");
        fetchStations();
      } else {
        throw new Error(data.error || "Failed to create station");
      }
    } catch (error) {
      console.error("Error creating station:", error);
      toast({
        title: "Error",
        description: "Failed to create station",
        variant: "destructive",
      });
    } finally {
      setIsCreatingStation(false);
    }
  };

  const systemStations = stations.filter(station => station.isSystem);
  const userStations = stations.filter(station => !station.isSystem);

  return (
    <Container>
      <div className="flex flex-col justify-center items-center">
        <div className="w-full flex flex-row justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-white">Music Stations</h1>

          <div className="flex gap-3">
            {session && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium py-2 px-6 rounded-md hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Station
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Create New Station</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="station-name">Station Name</Label>
                      <Input
                        id="station-name"
                        value={newStationName}
                        onChange={(e) => setNewStationName(e.target.value)}
                        placeholder="Enter station name..."
                        className="bg-gray-800 border-gray-600 text-white"
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="station-description">Description (Optional)</Label>
                      <Input
                        id="station-description"
                        value={newStationDescription}
                        onChange={(e) => setNewStationDescription(e.target.value)}
                        placeholder="Enter station description..."
                        className="bg-gray-800 border-gray-600 text-white"
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="station-playlist">Spotify Playlist (Optional)</Label>
                      <Input
                        id="station-playlist"
                        value={newStationPlaylistId}
                        onChange={(e) => setNewStationPlaylistId(e.target.value)}
                        placeholder="Paste Spotify playlist URL or ID"
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-400">
                        Supports: playlist URLs, spotify: URIs, or just the playlist ID<br />
                        Example: https://open.spotify.com/playlist/3FLeoYJly0d3PCqoXO28aL
                      </p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateDialog(false);
                          setNewStationName("");
                          setNewStationDescription("");
                          setNewStationPlaylistId("");
                        }}
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createStation}
                        disabled={isCreatingStation || !newStationName.trim()}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:opacity-90"
                      >
                        {isCreatingStation ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          "Create Station"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {systemStations.length === 0 && (
              <Button 
                onClick={initializeSystemStations}
                disabled={isInitializingSystem}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-2 px-6 rounded-md hover:opacity-90 transition-opacity"
              >
                {isInitializingSystem ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                    Initializing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Setup System Stations
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="w-full flex justify-center items-center h-64">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500"></div>
              <p className="text-white">Loading stations...</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-8">
            {/* System Stations Section */}
            {systemStations.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-green-500" />
                  <h2 className="text-2xl font-bold text-white">Featured Stations</h2>
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none px-3 py-1">
                    Curated by SongSymmetry
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {systemStations.map((station) => (
                    <Link key={station.id} href={`/station/${station.id}`}>
                      <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-gray-900 to-gray-800 border border-green-500/30 overflow-hidden group h-full">
                        <div className="flex flex-col h-full">
                          <div className="h-40 bg-gradient-to-br from-green-500 to-blue-500 relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none px-2 py-1 text-xs font-semibold">
                                <Sparkles className="w-3 h-3 mr-1" />
                                SYSTEM
                              </Badge>
                            </div>
                            {/* Live Indicator */}
                            {station.isPlaying && (
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-red-500 text-white border-none px-2 py-1 text-xs font-semibold animate-pulse">
                                  <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                                  ON AIR
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 p-3">
                            <h3 className="text-lg font-bold text-white group-hover:text-green-500 transition-colors leading-tight">
                              {station.name}
                            </h3>
                            {station.description && (
                              <p className="text-gray-300 text-xs line-clamp-2">
                                {station.description}
                              </p>
                            )}
                            <div className="flex flex-col gap-1 mt-2">
                              {/* Now Playing / Last Played */}
                              {station.currentTrack ? (
                                station.isPlaying ? (
                                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded-md px-2 py-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="truncate">
                                      {station.currentTrack.name} - {station.currentTrack.artist}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-500/10 rounded-md px-2 py-1">
                                    <i className="bi bi-pause text-gray-500"></i>
                                    <span className="truncate">
                                      {station.currentTrack.name} - {station.currentTrack.artist}
                                    </span>
                                  </div>
                                )
                              ) : null}
                              
                              {/* Stats */}
                              <div className="flex items-center text-xs text-gray-400 gap-3">
                                <span className="flex items-center gap-1">
                                  <i className="bi bi-people-fill text-green-500"></i>
                                  {station._count.members}
                                </span>
                                <span className="flex items-center gap-1">
                                  <i className="bi bi-music-note-list text-green-500"></i>
                                  {station._count.tracks}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* User Stations Section */}
            {userStations.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-purple-500" />
                  <h2 className="text-2xl font-bold text-white">Community Stations</h2>
                  <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none px-3 py-1">
                    Created by Users
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userStations.map((station) => (
                    <Link key={station.id} href={`/station/${station.id}`}>
                      <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/30 overflow-hidden group h-full">
                        <div className="flex flex-col h-full">
                          <div className="h-40 bg-gradient-to-br from-purple-500 to-pink-500 relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none px-2 py-1 text-xs font-semibold">
                                <Crown className="w-3 h-3 mr-1" />
                                USER
                              </Badge>
                            </div>
                            {/* Live Indicator */}
                            {station.isPlaying && (
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-red-500 text-white border-none px-2 py-1 text-xs font-semibold animate-pulse">
                                  <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                                  ON AIR
                                </Badge>
                              </div>
                            )}
                            {station.owner && (
                              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white/90">
                                <i className="bi bi-person-badge"></i>
                                <span className="truncate">{station.owner.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 p-3">
                            <h3 className="text-lg font-bold text-white group-hover:text-purple-500 transition-colors leading-tight">
                              {station.name}
                            </h3>
                            {station.description && (
                              <p className="text-gray-300 text-xs line-clamp-2">
                                {station.description}
                              </p>
                            )}
                            <div className="flex flex-col gap-1 mt-2">
                              {/* Now Playing / Last Played */}
                              {station.currentTrack ? (
                                station.isPlaying ? (
                                  <div className="flex items-center gap-2 text-xs text-purple-400 bg-purple-500/10 rounded-md px-2 py-1">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                    <span className="truncate">
                                      {station.currentTrack.name} - {station.currentTrack.artist}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-500/10 rounded-md px-2 py-1">
                                    <i className="bi bi-pause text-gray-500"></i>
                                    <span className="truncate">
                                      {station.currentTrack.name} - {station.currentTrack.artist}
                                    </span>
                                  </div>
                                )
                              ) : null}
                              
                              {/* Stats */}
                              <div className="flex items-center text-xs text-gray-400 gap-3">
                                <span className="flex items-center gap-1">
                                  <i className="bi bi-people-fill text-purple-500"></i>
                                  {station._count.members}
                                </span>
                                <span className="flex items-center gap-1">
                                  <i className="bi bi-music-note-list text-purple-500"></i>
                                  {station._count.tracks}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {stations.length === 0 && (
              <div className="w-full flex flex-col justify-center items-center h-64 border border-dashed border-gray-700 rounded-lg p-8">
                <div className="text-center space-y-4">
                  <i className="bi bi-music-note-beamed text-purple-400 text-5xl"></i>
                  <p className="text-white text-lg">No stations found</p>
                  <p className="text-gray-400 text-sm">
                    Initialize system stations to get started with curated music experiences.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}