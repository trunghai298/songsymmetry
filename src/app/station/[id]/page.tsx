"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Container from "../../components/core/Container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
import { usePlayer } from "@/hooks/usePlayer";
import { Track } from "@spotify/web-api-ts-sdk";
import { useSpotify } from "@/app/components/SpotifyProvider";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthUser } from "@/lib/session";

interface Station {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  playlistId: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  members: StationMember[];
  tracks: StationTrack[];
  _count: {
    members: number;
    tracks: number;
  };
}

interface StationMember {
  id: string;
  joinedAt: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface StationTrack {
  id: string;
  trackId: string;
  name: string | null;
  artist: string | null;
  imageUrl: string | null;
  addedAt: string;
  addedById: string;
  addedBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

export default function StationDetailPage() {
  const params = useParams();
  const stationId = params?.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const { playPlaylist: setPlaylist, playTrack: setTrack } = usePlayer();
  const spotify = useSpotify();

  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeMembers, setActiveMembers] = useState<string[]>([]);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);

  // Socket connection
  const { isConnected, joinStation, leaveStation, addTrack, subscribe } =
    useSocket();
  console.log("[Page] Socket connection status:", isConnected);
  
  const fetchStationData = useCallback(async (showLoading = true) => {
    console.log("Fetching station data for ID:", stationId);
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const response = await fetch(`/api/stations/${stationId}`);
      console.log("Station response status:", response.status);

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Station not found",
            description: "This station doesn't exist or has been deleted",
            variant: "destructive",
          });
          router.push("/station");
          return;
        }
        throw new Error("Failed to fetch station");
      }

      const data = await response.json();
      console.log("Station data received:", data);
      console.log("Tracks in station:", data.tracks ? data.tracks.length : 0);

      // Make sure we have an array of tracks even if it's undefined in the response
      if (!data.tracks) {
        data.tracks = [];
      }

      setStation(data);
    } catch (error) {
      console.error("Error fetching station:", error);
      toast({
        title: "Error",
        description: "Failed to load station data",
        variant: "destructive",
      });
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [stationId, toast, router]);

  // Fetch station data
  useEffect(() => {
    fetchStationData();
  }, [fetchStationData]);

  // Join the station's socket room when connected
  // Debug active members
  useEffect(() => {
    console.log("[Page] Current active members:", activeMembers);
  }, [activeMembers]);

  useEffect(() => {
    if (isConnected && session && station) {
      const user = getAuthUser(session);
      if (!user?.id) return;

      console.log(
        "[Page] Connecting to station",
        stationId,
        "as user",
        user.id
      );
      console.log("[Page] Socket connected status:", isConnected);

      joinStation(stationId, user.id);

      // Listen for user joined events
      const unsubscribeUserJoined = subscribe("user-joined", (data: any) => {
        console.log("[Page] Received user-joined event with data:", data);

        // Show toast notification
        toast({
          title: "User joined",
          description: `A new listener has joined the station`,
          variant: "default",
        });

        // Update active members list - make sure we don't add duplicates
        setActiveMembers((prev) => {
          if (prev.includes(data.userId)) return prev;
          return [...prev, data.userId];
        });
      });

      // Listen for user left events
      const unsubscribeUserLeft = subscribe("user-left", (data: any) => {
        console.log("[Page] Received user-left event with data:", data);

        // Show toast notification
        toast({
          title: "User left",
          description: `A listener has left the station`,
          variant: "default",
        });

        // Update active members list
        setActiveMembers((prev) => prev.filter((id) => id !== data.userId));
      });

      // Listen for track added events
      const unsubscribeTrackAdded = subscribe("track-added", (data: any) => {
        console.log("[Page] Received track-added event with data:", data);

        // Only show toast if we have track data
        if (data.track?.name) {
          toast({
            title: "New track added",
            description: `${data.track.name} by ${
              data.track.artist || "Unknown Artist"
            } was added to the station`,
            variant: "default",
          });
        } else {
          console.warn(
            "[Page] Received track-added event but track data is incomplete:",
            data
          );
        }

        // Update station data with the new track if we have track data
        if (data.track) {
          setStation((prev) => {
            if (!prev) return null;

            // Check if track is already in the list to avoid duplicates
            const trackExists = prev.tracks.some((t) => t.id === data.track.id);
            if (trackExists) {
              console.log(
                "[Page] Track already exists in station, not adding duplicate"
              );
              return prev;
            }

            return {
              ...prev,
              tracks: [data.track, ...prev.tracks],
              _count: {
                ...prev._count,
                tracks: prev._count.tracks + 1,
              },
            };
          });
        }
      });

      // Leave the room when component unmounts
      return () => {
        leaveStation(stationId, user.id);
        unsubscribeUserJoined();
        unsubscribeUserLeft();
        unsubscribeTrackAdded();
      };
    }
  }, [
    isConnected,
    session,
    station,
    stationId,
    joinStation,
    leaveStation,
    subscribe,
    toast,
  ]);

  const handleJoinStation = async () => {
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to join a station",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`/api/stations/${stationId}/members`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to join station");
      }

      // Refresh station data
      fetchStationData(false);

      toast({
        title: "Joined station",
        description: "You are now a member of this station",
      });
    } catch (error) {
      console.error("Error joining station:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to join station",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveStation = async () => {
    if (!session?.user) return;

    setIsLeaving(true);
    try {
      const response = await fetch(`/api/stations/${stationId}/members`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to leave station");
      }

      // Refresh station data
      fetchStationData(false);

      toast({
        title: "Left station",
        description: "You are no longer a member of this station",
      });
    } catch (error) {
      console.error("Error leaving station:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to leave station",
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteStation = async () => {
    // Type guard to check for id property
    const user = session?.user as any;
    if (!user || !station || station.owner.id !== user.id) return;

    if (
      !confirm(
        "Are you sure you want to delete this station? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/stations/${stationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete station");
      }

      toast({
        title: "Station deleted",
        description: "Your station has been deleted",
      });

      // Redirect to stations list
      router.push("/station");
    } catch (error) {
      console.error("Error deleting station:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete station",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // First try using the spotify SDK directly if available
      if (spotify?.sdk) {
        const results = await spotify.sdk.search(
          searchQuery,
          ["track"],
          undefined,
          10
        );
        setSearchResults(results.tracks.items);
      } else {
        // Fall back to our custom API endpoint if SDK is not initialized
        console.log("Spotify SDK not available, using fallback API");
        const response = await fetch(
          `/api/spotify/search?query=${encodeURIComponent(
            searchQuery
          )}&type=track&limit=10`
        );

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const data = await response.json();
        setSearchResults(data.tracks.items);
      }
    } catch (error) {
      console.error("Error searching tracks:", error);
      toast({
        title: "Error",
        description: "Failed to search for tracks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = async (track: Track) => {
    const user = getAuthUser(session);
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to add tracks",
        variant: "destructive",
      });
      return;
    }

    setAddingTrackId(track.id);
    try {
      console.log("Adding track:", track);

      const trackData = {
        trackId: track.id,
        name: track.name,
        artist: track.artists[0].name,
        imageUrl: track.album.images[0]?.url,
      };

      console.log("Track data to send:", trackData);
      console.log("User ID:", user.id);
      console.log("Station ID:", stationId);

      const response = await fetch(`/api/stations/${stationId}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trackData),
      });

      const responseText = await response.text();
      console.log("Response from API:", response.status, responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing response as JSON:", e);
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to add track");
      }

      // Notify other members via socket
      addTrack(stationId, user.id, responseData);

      // Clear search results
      setSearchQuery("");
      setSearchResults([]);

      // Refresh station data
      await fetchStationData(false);

      toast({
        title: "Track added",
        description: `${track.name} has been added to the station`,
      });
    } catch (error) {
      console.error("Error adding track:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add track",
        variant: "destructive",
      });
    } finally {
      setAddingTrackId(null);
    }
  };

  const handlePlayTrack = (track: any) => {
    const trackData = {
      id: track.trackId,
      name: track.name,
      artists: [{ name: track.artist }],
    };
    setTrack(trackData as Track);
  };

  const handlePlayStation = () => {
    if (!station) return;

    if (station.playlistId) {
      setPlaylist({ id: station.playlistId } as any);
    } else if (station.tracks && station.tracks.length > 0) {
      handlePlayTrack(station.tracks[0].trackId);
    }
  };

  const handleImportPlaylist = async () => {
    if (!station?.playlistId) {
      toast({
        title: "No playlist configured",
        description: "This station doesn't have a Spotify playlist configured.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingPlaylist(true);
    try {
      // Fetch the playlist data from Spotify
      const response = await fetch(
        `/api/spotify/playlist/${station.playlistId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch playlist data");
      }

      const playlistData = await response.json();
      const tracks = playlistData.tracks.items
        .map((item: any) => item.track)
        .filter((track: any) => track !== null);

      if (tracks.length === 0) {
        toast({
          title: "Empty playlist",
          description: "The playlist doesn't contain any tracks to import.",
          variant: "destructive",
        });
        return;
      }

      // Add tracks to the station one by one
      let successCount = 0;
      let failCount = 0;

      for (const track of tracks) {
        try {
          const trackData = {
            trackId: track.id,
            name: track.name,
            artist: track.artists[0].name,
            imageUrl: track.album.images[0]?.url,
          };

          const addResponse = await fetch(`/api/stations/${stationId}/tracks`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(trackData),
          });

          if (addResponse.ok) {
            const responseData = await addResponse.json();
            const user = getAuthUser(session);
            if (user?.id) {
              addTrack(stationId, user.id, responseData);
            }
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error("Error adding track:", error);
          failCount++;
        }
      }

      // Refresh station data
      await fetchStationData(false);

      // Show success message
      toast({
        title: "Playlist imported",
        description: `Successfully imported ${successCount} tracks${
          failCount > 0 ? `, failed to import ${failCount} tracks` : ""
        }.`,
        variant: successCount > 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error importing playlist:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to import playlist",
        variant: "destructive",
      });
    } finally {
      setIsImportingPlaylist(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isUserMember = () => {
    const user = getAuthUser(session);
    if (!user?.id || !station) return false;
    return station.members.some((member) => member.userId === user.id);
  };

  const isStationOwner = () => {
    const user = getAuthUser(session);
    if (!user?.id || !station) return false;
    return station.owner.id === user.id;
  };

  if (isLoading) {
    return (
      <Container>
        <div className="w-full flex justify-center items-center h-64 mt-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-16 h-16 animate-float">
              <div className="absolute top-0 right-0 bottom-0 left-0 border-t-purple-500 border-4 border-transparent rounded-full animate-spin"></div>
              <div className="absolute top-0 right-0 bottom-0 left-0 border-purple-300 border-2 border-dashed rounded-full animate-spin-slow"></div>
              <div className="absolute inset-[6px] border-2 border-indigo-400/30 rounded-full animate-pulse-slow"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="bi bi-music-note-beamed text-purple-400 animate-pulse-slow"></i>
              </div>
            </div>
            <p className="text-white text-xl font-medium">Loading station...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (!station) {
    return (
      <Container>
        <div className="w-full flex justify-center items-center h-64 mt-8">
          <div className="flex flex-col items-center space-y-4 text-center max-w-md">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
              <i className="bi bi-question-circle text-3xl text-gray-400"></i>
            </div>
            <h2 className="text-white text-xl font-medium">
              Station not found
            </h2>
            <p className="text-gray-400">
              This station may have been removed or you don&apos;t have permission to
              view it.
            </p>
            <Button onClick={() => router.push("/station")} variant="outline">
              <i className="bi bi-arrow-left mr-2"></i>
              Back to Stations
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex flex-col gap-6">
        {/* Station header */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Station image */}
          <div className="w-full md:w-1/3 relative group">
            <div
              className="h-64 bg-cover bg-center rounded-lg overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-[1.02]"
              style={{
                backgroundImage: `url('${
                  station.imageUrl ||
                  "https://i.scdn.co/image/ab67616d0000b273580ac3ad7dfc81e509171120"
                }')`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80"></div>
              {station.playlistId && (
                <div className="absolute bottom-4 left-4 flex items-center space-x-2 text-white bg-black/40 px-3 py-1.5 rounded-full">
                  <i className="bi bi-spotify text-green-400"></i>
                  <span className="text-sm font-medium">Spotify Playlist</span>
                </div>
              )}
            </div>
          </div>

          {/* Station details */}
          <div className="w-full md:w-2/3 flex flex-col justify-between">
            <div>
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  {station.name}
                </h1>

                {/* Action buttons - responsive grid */}
              </div>

              {station.description && (
                <p className="text-gray-300 italic">{station.description}</p>
              )}

              <div className="flex items-start sm:items-center mt-4 bg-gray-800/30 p-3 rounded-md">
                <Avatar className="h-10 w-10 mr-3 ring-2 ring-purple-500/50 ring-offset-2 ring-offset-gray-900 flex-shrink-0">
                  <AvatarImage src={station.owner.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-700">
                    {station.owner.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-gray-300 text-sm sm:text-base mb-1">
                    Created by{" "}
                    <span className="font-semibold text-purple-300">
                      {station.owner.name}
                    </span>
                  </span>

                  {/* Mobile: Stack stats vertically */}
                  <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm gap-1 sm:gap-0">
                    <span className="text-gray-400">
                      {formatDate(station.createdAt)}
                    </span>

                    <div className="flex items-center gap-3 sm:gap-0">
                      <span className="hidden sm:inline mx-2 text-gray-500">
                        •
                      </span>
                      <span className="text-gray-400 flex items-center">
                        <i className="bi bi-people-fill mr-1 text-purple-400"></i>
                        {station._count.members} member
                        {station._count.members !== 1 ? "s" : ""}
                      </span>

                      <span className="sm:hidden text-gray-500">•</span>
                      <span className="hidden sm:inline mx-2 text-gray-500">
                        •
                      </span>
                      <span className="text-gray-400 flex items-center">
                        <i className="bi bi-music-note-list mr-1 text-purple-400"></i>
                        {station._count.tracks} track
                        {station._count.tracks !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search for tracks (only for members) */}
            {isUserMember() && (
              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <div className="relative flex-grow">
                    <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <Input
                      placeholder="Search for tracks to add..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10 bg-gray-800/70 border-gray-700 focus:border-purple-500 transition-all"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSearching ? (
                      <>
                        <span className="mr-2 inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                        Searching...
                      </>
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="mt-3 max-h-60 overflow-y-auto bg-gray-800/80 backdrop-blur-sm rounded-md p-2 border border-gray-700 shadow-lg">
                    {searchResults.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-700/80 rounded-md transition-colors duration-150 cursor-pointer mb-1 last:mb-0"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={track.album.images[2]?.url}
                            alt={track.name}
                            className="w-10 h-10 rounded"
                          />
                          <div>
                            <p className="font-medium">{track.name}</p>
                            <p className="text-sm text-gray-400">
                              {track.artists.map((a) => a.name).join(", ")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddTrack(track)}
                          disabled={addingTrackId === track.id}
                          className="hover:bg-purple-600 hover:text-white transition-colors disabled:opacity-50"
                        >
                          {addingTrackId === track.id ? (
                            <>
                              <span className="mr-1 inline-block w-3 h-3 border border-t-transparent border-white rounded-full animate-spin"></span>
                              Adding...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plus-circle mr-1"></i> Add
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Station content */}
        <Tabs defaultValue="tracks" className="w-full mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList className="bg-gray-800/60 p-1">
              <TabsTrigger value="tracks">Tracks</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 w-full sm:w-auto">
              {!isUserMember() ? (
                <Button
                  onClick={handleJoinStation}
                  disabled={isJoining}
                  className="flex-1 sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
                >
                  {isJoining ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin mr-2"></i>
                      <span className="hidden sm:inline">Joining...</span>
                      <span className="sm:hidden">Join</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-plus mr-2"></i>
                      <span className="hidden sm:inline">Join Station</span>
                      <span className="sm:hidden">Join</span>
                    </>
                  )}
                </Button>
              ) : !isStationOwner() ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleLeaveStation}
                    disabled={isLeaving}
                    className="flex-1 sm:w-32 lg:w-36 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50"
                  >
                    {isLeaving ? (
                      <>
                        <i className="bi bi-arrow-repeat animate-spin mr-2"></i>
                        <span className="hidden sm:inline">Leaving...</span>
                        <span className="sm:hidden">Leave</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-dash mr-2"></i>
                        <span className="hidden sm:inline">Leave Station</span>
                        <span className="sm:hidden">Leave</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="default"
                    onClick={handlePlayStation}
                    className="flex-1 sm:w-32 lg:w-36 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <i className="bi bi-play-fill mr-2"></i>
                    <span className="hidden sm:inline">Play Station</span>
                    <span className="sm:hidden">Play</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteStation}
                    disabled={isDeleting}
                    className="flex-1 sm:w-32 lg:w-36 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <i className="bi bi-arrow-repeat animate-spin mr-2"></i>
                        <span className="hidden sm:inline">Deleting...</span>
                        <span className="sm:hidden">Delete</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash mr-2"></i>
                        <span className="hidden sm:inline">Delete Station</span>
                        <span className="sm:hidden">Delete</span>
                      </>
                    )}
                  </Button>
                  {station.playlistId && (
                    <Button
                      variant="outline"
                      onClick={handleImportPlaylist}
                      disabled={isImportingPlaylist}
                      className="flex-1 sm:w-32 lg:w-36 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white disabled:opacity-50"
                    >
                      {isImportingPlaylist ? (
                        <>
                          <i className="bi bi-arrow-repeat animate-spin mr-2"></i>
                          <span className="hidden sm:inline">Importing...</span>
                          <span className="sm:hidden">Import</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-spotify mr-2"></i>
                          <span className="hidden sm:inline">
                            Import Playlist
                          </span>
                          <span className="sm:hidden">Import</span>
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="default"
                    onClick={handlePlayStation}
                    className="flex-1 sm:w-32 lg:w-36 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <i className="bi bi-play-fill mr-2"></i>
                    <span className="hidden sm:inline">Play Station</span>
                    <span className="sm:hidden">Play</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          <TabsContent value="tracks" className="space-y-4 mt-2">
            {station.tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                <div className="w-24 h-24 bg-gray-800/70 rounded-full flex items-center justify-center mb-6 shadow-xl border border-gray-700 animate-float">
                  <i className="bi bi-music-note-beamed text-5xl text-purple-400 animate-pulse-slow"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  No tracks in this station yet
                </h3>
                {isUserMember() ? (
                  <div className="space-y-3 max-w-md">
                    <p className="text-gray-400">
                      Add some tracks to get the music flowing!
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button
                        onClick={() => {
                          const inputElement =
                            document.querySelector<HTMLInputElement>(
                              'input[placeholder="Search for tracks to add..."]'
                            );
                          inputElement?.focus();
                        }}
                      >
                        <i className="bi bi-search mr-2"></i>Search For Tracks
                      </Button>
                      {station.playlistId && isStationOwner() && (
                        <Button
                          variant="outline"
                          onClick={handleImportPlaylist}
                          disabled={isImportingPlaylist}
                        >
                          <i className="bi bi-spotify mr-2"></i>Import From
                          Playlist
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Join this station to add tracks!
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {station.tracks && station.tracks.length > 0 ? (
                  station.tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-3 bg-gray-800/70 rounded-lg hover:bg-gray-700/90 transition-all duration-200 group border border-transparent hover:border-gray-700 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        {track.imageUrl && (
                          <img
                            src={track.imageUrl}
                            alt={track.name || "Track"}
                            className="w-12 h-12 rounded"
                          />
                        )}
                        {!track.imageUrl && (
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center">
                            <i className="bi bi-music-note text-purple-400"></i>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 px-3">
                          <p className="font-medium text-white truncate">
                            {track.name || "Unknown Track"}
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            {track.artist || "Unknown Artist"}
                          </p>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <Avatar className="h-4 w-4 mr-1">
                              <AvatarImage
                                src={track.addedBy?.image || undefined}
                              />
                              <AvatarFallback className="text-[8px]">
                                {track.addedBy?.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              Added by {track.addedBy?.name || "Unknown"} •{" "}
                              {formatDate(track.addedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayTrack(track)}
                          className="rounded-full h-9 w-9 p-0 bg-gray-700/50 hover:bg-green-600 text-white group-hover:scale-110 transition-all"
                        >
                          <i className="bi bi-play-fill text-lg"></i>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
                    <i className="bi bi-exclamation-circle text-3xl text-gray-500 mb-2"></i>
                    <p className="text-gray-400">
                      No tracks found. Try refreshing the page.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => fetchStationData()}
                    >
                      <i className="bi bi-arrow-clockwise mr-2"></i>Refresh
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {station.members.map((member) => (
                <Card
                  key={member.id}
                  className="p-4 flex items-center gap-3 bg-gray-800/70 border-gray-700 hover:bg-gray-700/80 transition-colors"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-offset-gray-800 ring-purple-500/50">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback>
                      {member.user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-300">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Joined {formatDate(member.joinedAt)}
                    </p>
                  </div>
                  {member.userId === station.owner.id && (
                    <Badge
                      variant="secondary"
                      className="ml-auto bg-purple-600 text-white hover:bg-purple-700"
                    >
                      Owner
                    </Badge>
                  )}
                  {activeMembers.includes(member.userId) && (
                    <Badge className="ml-auto bg-green-600">Active</Badge>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}
