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
import { useSpotify } from "@/hooks/useSpotify";
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
  isPlaying?: boolean;
  currentTrackId?: string | null;
  currentSpotifyId?: string | null;
  playingStartedAt?: string | null;
  playingUserId?: string | null;
  lastActivityAt?: string | null;
  isSystem?: boolean;
  stationType?: string | null;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  playingUser?: {
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
  const {
    playPlaylist: setPlaylist,
    playTrack: setTrack,
    playQueueFromIndex,
    startPlayback,
    currentTrack,
    isPlaying,
    spotifyPlaybackState,
    getCurrentPlaybackState,
  } = usePlayer();
  const { client: spotify } = useSpotify();

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
  const [isPlayingStation, setIsPlayingStation] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [debugShowAnimation, setDebugShowAnimation] = useState(false);
  const [localPlayingTrack, setLocalPlayingTrack] = useState<StationTrack | null>(null);

  // Debug localPlayingTrack changes
  useEffect(() => {
    console.log("🔄 LocalPlayingTrack changed:", localPlayingTrack?.name || "null");
  }, [localPlayingTrack]);

  // Check current playback state on page load and periodically to detect playing songs
  useEffect(() => {
    let lastPlayingTrackId: string | null = null;
    
    const checkCurrentPlayback = async () => {
      try {
        const state = await getCurrentPlaybackState();
        if (state?.item && state.is_playing) {
          const currentTrackId = state.item.id;
          
          // Only process if the track has changed
          if (currentTrackId !== lastPlayingTrackId) {
            console.log("🔄 Track changed to:", state.item.name, currentTrackId);
            lastPlayingTrackId = currentTrackId;
            
            // Try to find matching station track
            if (station?.tracks) {
              const foundMatch = station.tracks.find(track => {
                // Direct ID match for enriched tracks
                if (!track.trackId.startsWith("track-") && track.trackId === currentTrackId) {
                  return true;
                }
                // Name/artist match for ChartMasters tracks
                if (track.name && track.artist && state.item.name && state.item.type === 'track' && 'artists' in state.item && state.item.artists?.[0]?.name) {
                  const normalizeString = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, "").trim();
                  const trackName = normalizeString(track.name);
                  const trackArtist = normalizeString(track.artist);
                  const stateName = normalizeString(state.item.name);
                  const stateArtist = normalizeString(state.item.artists[0].name);
                  return trackName === stateName && trackArtist === stateArtist;
                }
                return false;
              });
              
              if (foundMatch) {
                console.log("✅ Found matching station track:", foundMatch.name);
                setLocalPlayingTrack(foundMatch);
                // Update database state (fire and forget to avoid blocking)
                updateStationPlayingState(true, foundMatch.id, currentTrackId).catch(console.error);
              } else {
                console.log("❌ No matching station track found, clearing local playing track");
                setLocalPlayingTrack(null);
                // Update database to show not playing from this station (fire and forget)
                updateStationPlayingState(false).catch(console.error);
              }
            }
          }
        } else {
          // No track playing or paused
          if (lastPlayingTrackId !== null) {
            console.log("🔇 Playback stopped or paused");
            lastPlayingTrackId = null;
            setLocalPlayingTrack(null);
            // Update database to show not playing (fire and forget)
            updateStationPlayingState(false).catch(console.error);
          }
        }
      } catch (error) {
        console.error("Error checking playback state:", error);
      }
    };

    // Check immediately when station data is loaded
    if (station && !isLoading) {
      checkCurrentPlayback();
    }

    // Set up periodic checking every 3 seconds for better responsiveness
    const interval = setInterval(checkCurrentPlayback, 3000);
    
    return () => clearInterval(interval);
  }, [station, isLoading, getCurrentPlaybackState]);

  // Debug effect to log player state changes and trigger UI updates
  useEffect(() => {
    console.log("🎵 Player state changed:");
    console.log("- currentTrack:", currentTrack);
    console.log("- isPlaying:", isPlaying);
    console.log("- spotifyPlaybackState.item:", spotifyPlaybackState?.item);
    console.log(
      "- spotifyPlaybackState.is_playing:",
      spotifyPlaybackState?.is_playing
    );

    // Also log if we have any tracks in the station that might match
    if (station?.tracks && (currentTrack || spotifyPlaybackState?.item)) {
      const playingItem = spotifyPlaybackState?.item || currentTrack;
      console.log(
        "🔍 Checking station tracks for matches with:",
        playingItem?.name
      );

      // Force a check of all tracks to see matching logic
      let foundMatch = false;
      station.tracks.forEach((track, index) => {
        const match = isTrackCurrentlyPlaying(track);
        if (match) {
          console.log(`✅ Found match at index ${index}:`, track.name);
          foundMatch = true;
        }
      });

      if (!foundMatch && (currentTrack || spotifyPlaybackState?.item)) {
        console.log("❌ No matches found in station tracks");
        console.log("🔍 Detailed comparison for first few tracks:");
        station.tracks.slice(0, 3).forEach((track, index) => {
          console.log(`\n--- Track ${index}: ${track.name} ---`);
          isTrackCurrentlyPlaying(track); // This will trigger detailed debug logs
        });
      }
      
      // Clear local playing track once we have a successful match from Spotify state
      if (foundMatch && localPlayingTrack) {
        console.log("🔄 Clearing local playing track, Spotify state is now reliable");
        setLocalPlayingTrack(null);
      }
    }
  }, [currentTrack, isPlaying, spotifyPlaybackState, station?.tracks, localPlayingTrack]);

  // Socket connection
  const { isConnected, joinStation, leaveStation, addTrack, subscribe } =
    useSocket();
  console.log("[Page] Socket connection status:", isConnected);

  const fetchStationData = useCallback(
    async (showLoading = true) => {
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
    },
    [stationId, toast, router]
  );

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
      // First try using the spotify client directly if available
      if (spotify) {
        const results = await spotify.search(
          searchQuery,
          ["track"],
          undefined,
          10
        );
        setSearchResults(results.tracks?.items || []);
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

  const handlePlayTrack = async (track: StationTrack, trackIndex?: number) => {
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to play tracks",
        variant: "destructive",
      });
      return;
    }

    setPlayingTrackId(track.id);
    try {
      // Always play just the single track (removed queue logic)
      toast({
        title: "Loading track...",
        description: "Searching for track on Spotify",
      });

      const trackData = await convertStationTrackToSpotifyTrack(track);
      if (!trackData) {
        toast({
          title: "Track not found",
          description: `Unable to find "${track.name}" on Spotify`,
          variant: "destructive",
        });
        return;
      }

      // Get available devices for actual playback
      const devices = await getAvailableDevices();
      if (devices.length === 0) {
        toast({
          title: "No Active Device",
          description: "Please open Spotify on a device first",
          variant: "destructive",
        });
        return;
      }

      const activeDevice =
        devices.find((device: any) => device.is_active) || devices[0];

      // Start actual Spotify playback for single track
      await startPlayback([trackData.uri], activeDevice.id || undefined);

      // Update Redux state for UI
      setTrack(trackData);

      console.log("🎵 Single track playback started:");
      console.log("- Playing track URI:", trackData.uri);
      console.log("- Playing track ID:", trackData.id);
      console.log("- Playing track name:", trackData.name);
      console.log("- Device used:", activeDevice.name || activeDevice.id);
      console.log("- Original station track:", track.name, track.trackId);
      console.log("- ID Match Check:", trackData.id === track.trackId ? "✅ MATCH" : "❌ NO MATCH");

      // Store the currently playing track for immediate UI update
      setLocalPlayingTrack(track);

      // Update database with playing state (fire and forget to avoid blocking UI)
      updateStationPlayingState(true, track.id, trackData.id).catch(console.error);

      // Force refresh player state after a short delay
      setTimeout(async () => {
        console.log("🔄 Force refreshing player state...");
        const newState = await getCurrentPlaybackState();
        console.log(
          "🔄 New player state:",
          newState?.item?.name,
          newState?.is_playing
        );
        console.log("🔄 ID comparison:", newState?.item?.id, "vs", track.trackId);
        console.log("🔄 Should match:", newState?.item?.id === track.trackId ? "✅ YES" : "❌ NO");
      }, 2000);

      toast({
        title: "Playing track",
        description: `Playing "${track.name}"`,
      });

    } catch (error: any) {
      console.error("Error playing track:", error);

      // Handle specific Spotify API errors
      let errorMessage = "Failed to play track";
      if (error?.message?.includes("No active device")) {
        errorMessage = "Please open Spotify on a device first";
      } else if (error?.message?.includes("Premium")) {
        errorMessage = "Spotify Premium required for playback control";
      } else if (error?.message?.includes("Authentication")) {
        errorMessage = "Please sign in to Spotify again";
      }

      toast({
        title: "Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPlayingTrackId(null);
    }
  };

  const handlePlayStation = async () => {
    if (!station || !station.tracks || station.tracks.length === 0) {
      toast({
        title: "No tracks to play",
        description: "This station doesn't have any tracks yet",
        variant: "destructive",
      });
      return;
    }

    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to play station tracks",
        variant: "destructive",
      });
      return;
    }

    setIsPlayingStation(true);
    try {
      // If station has a Spotify playlist, play it directly
      if (station.playlistId) {
        setPlaylist({ id: station.playlistId } as any);
        return;
      }

      toast({
        title: "Loading station...",
        description: "Searching for tracks on Spotify",
      });

      // Convert station tracks to Spotify Track objects
      const spotifyTrackPromises = station.tracks
        .filter((track) => track.trackId)
        .map(convertStationTrackToSpotifyTrack);

      const spotifyTrackResults = await Promise.all(spotifyTrackPromises);
      const spotifyTracks: Track[] = spotifyTrackResults.filter(
        (track): track is Track => track !== null
      );

      if (spotifyTracks.length === 0) {
        toast({
          title: "No playable tracks",
          description: "Unable to find Spotify tracks for this station",
          variant: "destructive",
        });
        return;
      }
      // Get available devices for actual playback
      const devices = await getAvailableDevices();
      if (devices.length === 0) {
        toast({
          title: "No Active Device",
          description: "Please open Spotify on a device first",
          variant: "destructive",
        });
        return;
      }

      const activeDevice =
        devices.find((device: any) => device.is_active) || devices[0];

      // Start actual Spotify playback with track URIs
      const trackUris = spotifyTracks.map((track) => track.uri);
      await startPlayback(trackUris, activeDevice.id || undefined);

      // Update Redux state for UI
      playQueueFromIndex(spotifyTracks, 0);

      console.log("🎵 Station playback started:");
      console.log("- First track URI:", trackUris[0]);
      console.log("- First track ID:", spotifyTracks[0]?.id);
      console.log("- First track name:", spotifyTracks[0]?.name);
      console.log("- Device used:", activeDevice.name || activeDevice.id);

      // Always clear the previous local playing track first
      console.log("🧹 Clearing previous local playing track");
      setLocalPlayingTrack(null);

      // Simple approach: just set the first station track as playing
      // since we're playing the station in its original order
      const firstStationTrack = station.tracks[0];
      if (firstStationTrack) {
        console.log("🎯 Setting first station track as playing:", firstStationTrack.name);
        setTimeout(() => {
          setLocalPlayingTrack(firstStationTrack);
        }, 100);
        
        // Update database with station playing state (fire and forget)
        const firstSpotifyTrack = spotifyTracks[0];
        updateStationPlayingState(true, firstStationTrack.id, firstSpotifyTrack?.id).catch(console.error);
      } else {
        console.log("❌ No tracks in station");
      }

      // Force refresh player state after a short delay
      setTimeout(async () => {
        console.log("🔄 Force refreshing player state...");
        const newState = await getCurrentPlaybackState();
        console.log(
          "🔄 New player state:",
          newState?.item?.name,
          newState?.is_playing
        );
      }, 2000);

      toast({
        title: "Playing station",
        description: `Started playing ${spotifyTracks.length} tracks from ${station.name}`,
      });
    } catch (error: any) {
      console.error("Error playing station:", error);

      // Handle specific Spotify API errors
      let errorMessage = "Failed to play station tracks";
      if (error?.message?.includes("No active device")) {
        errorMessage = "Please open Spotify on a device first";
      } else if (error?.message?.includes("Premium")) {
        errorMessage = "Spotify Premium required for playback control";
      } else if (error?.message?.includes("Authentication")) {
        errorMessage = "Please sign in to Spotify again";
      }

      toast({
        title: "Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPlayingStation(false);
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

  // Get available devices for Spotify playback
  const getAvailableDevices = async () => {
    try {
      if (!spotify) return [];
      const devices = await spotify.getAvailableDevices();
      return devices.devices || [];
    } catch (error) {
      console.error("Error getting devices:", error);
      return [];
    }
  };

  // Utility function to search for a track on Spotify
  const searchSpotifyTrack = async (
    name: string,
    artist: string
  ): Promise<Track | null> => {
    try {
      if (spotify) {
        const searchQuery = `track:"${name}" artist:"${artist}"`;
        const results = await spotify.search(
          searchQuery,
          ["track"],
          undefined,
          1
        );
        return results.tracks?.items[0] || null;
      } else {
        // Fallback to API endpoint
        const response = await fetch(
          `/api/spotify/search?query=${encodeURIComponent(
            `track:"${name}" artist:"${artist}"`
          )}&type=track&limit=1`
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data.tracks.items[0] || null;
      }
    } catch (error) {
      console.error("Error searching for track:", error);
      return null;
    }
  };

  // Utility function to convert station track to Spotify Track object
  const convertStationTrackToSpotifyTrack = async (
    stationTrack: StationTrack
  ): Promise<Track | null> => {
    // Check if this is a real Spotify track ID (not starting with "track-")
    const isRealSpotifyId = !stationTrack.trackId.startsWith("track-");

    // For ChartMasters data, check if we can get the spotifyId from the database
    if (!isRealSpotifyId && stationTrack.trackId.startsWith("track-")) {
      const songId = stationTrack.trackId.replace("track-", "");
      try {
        // Try to get the spotifyId from the MostStreamedSongs table
        const response = await fetch(`/api/songs/spotify-data/${songId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.spotifyId) {
            // We have a spotifyId, use it directly
            return {
              id: data.spotifyId,
              name: data.name || "Unknown Track",
              artists: data.artist
                ? [
                    {
                      id: "",
                      name: data.artist,
                      href: "",
                      external_urls: { spotify: "" },
                      type: "artist",
                      uri: "",
                    },
                  ]
                : [
                    {
                      id: "",
                      name: "Unknown Artist",
                      href: "",
                      external_urls: { spotify: "" },
                      type: "artist",
                      uri: "",
                    },
                  ],
              album: {
                id: "",
                name: "Unknown Album",
                href: "",
                images: data.thumbnail
                  ? [{ url: data.thumbnail, height: 640, width: 640 }]
                  : [],
                release_date: "",
                release_date_precision: "day",
                total_tracks: 0,
                type: "album",
                uri: "",
                external_urls: { spotify: "" },
                album_type: "album",
                artists: [],
                available_markets: [],
                album_group: "",
                copyrights: [],
                external_ids: { upc: "", ean: "", isrc: "" },
                genres: [],
                label: "",
                restrictions: undefined,
                popularity: 0,
              },
              duration_ms: 0,
              explicit: false,
              external_ids: { isrc: "", upc: "", ean: "" },
              external_urls: {
                spotify: `https://open.spotify.com/track/${data.spotifyId}`,
              },
              href: "",
              is_local: false,
              popularity: 0,
              preview_url: null,
              track_number: 1,
              type: "track",
              uri: `spotify:track:${data.spotifyId}`,
              is_playable: true,
              disc_number: 1,
              available_markets: [],
              episode: false,
              track: true,
            };
          } else {
            // No spotifyId yet, search for it
            const spotifyTrack = await searchSpotifyTrack(
              data.name,
              data.artist
            );
            if (spotifyTrack) {
              // Update the database with the found spotifyId
              try {
                await fetch("/api/songs/update-spotify-id", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    songId: songId,
                    spotifyId: spotifyTrack.id,
                    thumbnail: spotifyTrack.album.images[0]?.url,
                  }),
                });
                console.log(
                  `Updated song ${songId} with Spotify ID: ${spotifyTrack.id}`
                );
              } catch (error) {
                console.warn("Failed to update spotifyId in database:", error);
              }
              return spotifyTrack;
            }
          }
        }
      } catch (error) {
        console.warn("Failed to get spotifyId from database:", error);
      }
    }

    if (isRealSpotifyId) {
      // Use the existing Spotify track ID directly
      return {
        id: stationTrack.trackId,
        name: stationTrack.name || "Unknown Track",
        artists: stationTrack.artist
          ? [
              {
                id: "",
                name: stationTrack.artist,
                href: "",
                external_urls: { spotify: "" },
                type: "artist",
                uri: "",
              },
            ]
          : [
              {
                id: "",
                name: "Unknown Artist",
                href: "",
                external_urls: { spotify: "" },
                type: "artist",
                uri: "",
              },
            ],
        album: {
          id: "",
          name: "Unknown Album",
          href: "",
          images: stationTrack.imageUrl
            ? [{ url: stationTrack.imageUrl, height: 640, width: 640 }]
            : [],
          release_date: "",
          release_date_precision: "day",
          total_tracks: 0,
          type: "album",
          uri: "",
          external_urls: { spotify: "" },
          album_type: "album",
          artists: [],
          available_markets: [],
          album_group: "",
          copyrights: [],
          external_ids: { upc: "", ean: "", isrc: "" },
          genres: [],
          label: "",
          restrictions: undefined,
          popularity: 0,
        },
        duration_ms: 0,
        explicit: false,
        external_ids: { isrc: "", upc: "", ean: "" },
        external_urls: {
          spotify: `https://open.spotify.com/track/${stationTrack.trackId}`,
        },
        href: "",
        is_local: false,
        popularity: 0,
        preview_url: null,
        track_number: 1,
        type: "track",
        uri: `spotify:track:${stationTrack.trackId}`,
        is_playable: true,
        disc_number: 1,
        available_markets: [],
        episode: false,
        track: true,
      };
    } else {
      // This is ChartMasters data - search for the track on Spotify
      if (!stationTrack.name || !stationTrack.artist) {
        console.warn(
          "Missing track name or artist for ChartMasters track:",
          stationTrack
        );
        return null;
      }

      const spotifyTrack = await searchSpotifyTrack(
        stationTrack.name,
        stationTrack.artist
      );

      // If we found the track and this is ChartMasters data, update the database
      if (spotifyTrack && stationTrack.trackId.startsWith("track-")) {
        const songId = stationTrack.trackId.replace("track-", "");
        try {
          await fetch("/api/songs/update-spotify-id", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              songId: songId,
              spotifyId: spotifyTrack.id,
              thumbnail: spotifyTrack.album.images[0]?.url,
            }),
          });
          console.log(
            `Updated song ${songId} with Spotify ID: ${spotifyTrack.id}`
          );
        } catch (error) {
          console.warn("Failed to update spotifyId in database:", error);
        }
      }

      return spotifyTrack;
    }
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

  // Function to update station playing state in database
  const updateStationPlayingState = async (
    isPlaying: boolean,
    currentTrackId?: string,
    currentSpotifyId?: string
  ) => {
    try {
      const response = await fetch(`/api/stations/${stationId}/playing-state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPlaying,
          currentTrackId: currentTrackId || null,
          currentSpotifyId: currentSpotifyId || null,
          playingStartedAt: isPlaying ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) {
        console.error("Failed to update station playing state");
      } else {
        console.log("✅ Updated station playing state in database");
      }
    } catch (error) {
      console.error("Error updating station playing state:", error);
    }
  };

  // Check if a specific track is currently playing
  const isTrackCurrentlyPlaying = (track: StationTrack): boolean => {
    // First check database state - this is the most reliable source
    if (station?.isPlaying && station?.currentTrackId === track.id) {
      console.log("✅ Database playing track match:", track.name);
      return true;
    }
    
    // Second check if this is the track we just started playing locally
    if (localPlayingTrack && localPlayingTrack.id === track.id) {
      console.log("✅ Local playing track match:", track.name);
      return true;
    }
    // Enhanced debug logging
    const debugTrackMatch = (source: string, playingTrack: any) => {
      console.log(
        `🔍 [${source}] Checking track: "${track.name}" by "${track.artist}" (trackId: ${track.trackId})`
      );
      console.log(
        `🔍 [${source}] Against playing: "${playingTrack?.name}" by "${playingTrack?.artists?.[0]?.name}" (id: ${playingTrack?.id})`
      );

      // Check direct ID match for enriched tracks
      if (!track.trackId.startsWith("track-")) {
        const idMatch = playingTrack.id === track.trackId;
        console.log(
          `🔍 [${source}] Direct ID comparison: "${playingTrack.id}" === "${track.trackId}" = ${idMatch}`
        );
        return idMatch;
      }

      // Check name/artist match for ChartMasters tracks
      if (
        playingTrack.name &&
        track.name &&
        playingTrack.artists?.[0]?.name &&
        track.artist
      ) {
        const normalizeString = (str: string) =>
          str
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .trim();
        const playingTrackName = normalizeString(playingTrack.name);
        const playingArtist = normalizeString(playingTrack.artists[0].name);
        const stationTrackName = normalizeString(track.name);
        const stationArtist = normalizeString(track.artist);

        const nameMatch = playingTrackName === stationTrackName;
        const artistMatch = playingArtist === stationArtist;

        console.log(
          `🔍 [${source}] Name comparison: "${playingTrackName}" === "${stationTrackName}" = ${nameMatch}`
        );
        console.log(
          `🔍 [${source}] Artist comparison: "${playingArtist}" === "${stationArtist}" = ${artistMatch}`
        );

        return nameMatch && artistMatch;
      }

      console.log(`🔍 [${source}] No valid comparison possible`);
      return false;
    };

    // First check using spotifyPlaybackState (most reliable)
    if (spotifyPlaybackState?.item && spotifyPlaybackState.is_playing) {
      const isMatch = debugTrackMatch(
        "SpotifyPlaybackState",
        spotifyPlaybackState.item
      );
      if (isMatch) {
        console.log("✅ Spotify playback state match:", track.name);
        return true;
      }
    }

    // Fallback to currentTrack from Redux
    if (currentTrack && isPlaying) {
      const isMatch = debugTrackMatch("ReduxCurrentTrack", currentTrack);
      if (isMatch) {
        console.log("✅ Redux currentTrack match:", track.name);
        return true;
      }
    }

    return false;
  };

  // Function to reorder tracks with currently playing track at the top
  const getOrderedTracks = (tracks: StationTrack[]): StationTrack[] => {
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
              This station may have been removed or you don&apos;t have
              permission to view it.
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
        {/* Back button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push("/station")}
            className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            <i className="bi bi-arrow-left text-lg"></i>
            <span className="hidden sm:inline">Back to Stations</span>
            <span className="sm:hidden">Back</span>
          </Button>
          {/* Debug button - remove this later */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDebugShowAnimation(!debugShowAnimation)}
            className="text-xs text-black"
          >
            {debugShowAnimation ? "Hide" : "Show"} Animation Test
          </Button>
        </div>

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
                    disabled={isPlayingStation}
                    className="flex-1 sm:w-32 lg:w-36 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlayingStation ? (
                      <>
                        <span className="mr-2 inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                        <span className="hidden sm:inline">Loading...</span>
                        <span className="sm:hidden">Loading</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-play-fill mr-2"></i>
                        <span className="hidden sm:inline">Play Station</span>
                        <span className="sm:hidden">Play</span>
                      </>
                    )}
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
                    disabled={isPlayingStation}
                    className="flex-1 sm:w-32 lg:w-36 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlayingStation ? (
                      <>
                        <span className="mr-2 inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                        <span className="hidden sm:inline">Loading...</span>
                        <span className="sm:hidden">Loading</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-play-fill mr-2"></i>
                        <span className="hidden sm:inline">Play Station</span>
                        <span className="sm:hidden">Play</span>
                      </>
                    )}
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
                  getOrderedTracks(station.tracks).map((track, index) => {
                    // Get the original index for the play function
                    const originalIndex = station.tracks.findIndex(
                      (t) => t.id === track.id
                    );
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 group hover:shadow-md ${
                          isTrackCurrentlyPlaying(track) ||
                          (debugShowAnimation && index === 0)
                            ? "bg-green-500/10 border border-green-500/30 hover:bg-green-500/15"
                            : "bg-gray-800/70 border border-transparent hover:bg-gray-700/90 hover:border-gray-700"
                        }`}
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
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white truncate">
                                {track.name || "Unknown Track"}
                              </p>
                              {(isTrackCurrentlyPlaying(track) ||
                                (debugShowAnimation && index === 0)) && (
                                <div className="flex items-center gap-1 text-green-400">
                                  <div
                                    className="flex items-end space-x-0.5"
                                    style={{ height: "16px" }}
                                  >
                                    <div
                                      className="w-1 bg-green-400 rounded-full"
                                      style={{
                                        height: "6px",
                                        animation:
                                          "audioBar1 1.2s ease-in-out infinite",
                                      }}
                                    ></div>
                                    <div
                                      className="w-1 bg-green-400 rounded-full"
                                      style={{
                                        height: "12px",
                                        animation:
                                          "audioBar2 1.5s ease-in-out infinite",
                                      }}
                                    ></div>
                                    <div
                                      className="w-1 bg-green-400 rounded-full"
                                      style={{
                                        height: "8px",
                                        animation:
                                          "audioBar3 1.1s ease-in-out infinite",
                                      }}
                                    ></div>
                                    <div
                                      className="w-1 bg-green-400 rounded-full"
                                      style={{
                                        height: "14px",
                                        animation:
                                          "audioBar4 1.3s ease-in-out infinite",
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
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
                            onClick={() =>
                              handlePlayTrack(track, originalIndex)
                            }
                            disabled={playingTrackId === track.id}
                            className={`rounded-full h-9 w-9 p-0 text-white group-hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                              isTrackCurrentlyPlaying(track) ||
                              (debugShowAnimation && index === 0)
                                ? "bg-green-500 hover:bg-green-600"
                                : "bg-gray-700/50 hover:bg-green-600"
                            }`}
                            title={
                              isTrackCurrentlyPlaying(track)
                                ? `"${track.name}" is currently playing`
                                : `Play "${track.name}" and continue with station queue`
                            }
                          >
                            {playingTrackId === track.id ? (
                              <span className="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                            ) : isTrackCurrentlyPlaying(track) ||
                              (debugShowAnimation && index === 0) ? (
                              <i className="bi bi-pause-fill text-lg"></i>
                            ) : (
                              <i className="bi bi-play-fill text-lg"></i>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })
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
