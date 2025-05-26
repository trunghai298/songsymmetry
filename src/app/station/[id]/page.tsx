"use client";
import React, { useEffect, useState, useRef } from "react";
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
import { useStationData, StationTrack } from "@/hooks/useStationData";
import { useStationPlayingState } from "@/hooks/useStationPlayingState";
import TrackList from "./components/TrackList";
import StationChat from "./components/StationChat";
import { setPlaylist } from "@/lib/redux/slices/playlistSlices";

export default function StationDetailPage() {
  const params = useParams();
  const stationId = params?.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const {
    playTrack: setTrack,
    startPlayback,
    getCurrentPlaybackState,
  } = usePlayer();
  const { client: spotify } = useSpotify();

  // Use custom hooks
  const { station, setStation, isLoading, fetchStationData } =
    useStationData(stationId);
  const {
    setLocalPlayingTrack,
    isTrackCurrentlyPlaying,
    updateStationPlayingState,
    isStationOwner,
    isUserMember,
  } = useStationPlayingState(stationId, station);

  // Component state (only UI-specific state remains)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [debugShowAnimation, setDebugShowAnimation] = useState(false);

  // Track whether we've joined the station to prevent multiple joins
  const hasJoinedStationRef = useRef(false);
  const currentStationIdRef = useRef<string | null>(null);

  // Socket connection
  const { isConnected, joinStation, leaveStation, addTrack, subscribe } =
    useSocket();

  // Initialize station data
  useEffect(() => {
    fetchStationData();
  }, [fetchStationData]);

  // Join the station's socket room when connected
  useEffect(() => {
    console.log("🔄 Station socket effect running:", {
      isConnected,
      hasSession: !!session,
      hasStation: !!station,
      stationId,
      hasJoined: hasJoinedStationRef.current,
      currentStationId: currentStationIdRef.current
    });

    if (isConnected && session && station) {
      const user = getAuthUser(session);
      if (!user?.id) return;

      // Check if we've already joined this station
      if (hasJoinedStationRef.current && currentStationIdRef.current === stationId) {
        console.log("⚠️ Already joined station:", stationId, "- skipping");
        return;
      }

      // If we're switching stations, leave the previous one first
      if (hasJoinedStationRef.current && currentStationIdRef.current && currentStationIdRef.current !== stationId) {
        console.log("🔄 Switching stations - leaving:", currentStationIdRef.current);
        leaveStation(currentStationIdRef.current, user.id);
      }

      console.log("✅ Joining station:", stationId, "for user:", user.id);
      hasJoinedStationRef.current = true;
      currentStationIdRef.current = stationId;
      joinStation(stationId, user.id);

      // Listen for user joined events
      const unsubscribeUserJoined = subscribe("user-joined", (data: any) => {
        console.log("🔥 STATION PAGE: Received user-joined event:", data);
        toast({
          title: "User joined",
          description: `A new listener has joined the station`,
          variant: "default",
        });
      });

      // Listen for user left events
      const unsubscribeUserLeft = subscribe("user-left", (data: any) => {
        console.log("🔥 STATION PAGE: Received user-left event:", data);
        toast({
          title: "User left",
          description: `A listener has left the station`,
          variant: "default",
        });
      });

      // Listen for track added events
      const unsubscribeTrackAdded = subscribe("track-added", (data: any) => {
        if (data.track?.name) {
          toast({
            title: "New track added",
            description: `${data.track.name} by ${
              data.track.artist || "Unknown Artist"
            } was added to the station`,
            variant: "default",
          });
        }

        if (data.track) {
          setStation((prev) => {
            if (!prev) return null;
            const trackExists = prev.tracks.some((t) => t.id === data.track.id);
            if (trackExists) return prev;

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

      // Listen for track removed events
      const unsubscribeTrackRemoved = subscribe("track-removed", (data: any) => {
        toast({
          title: "Track removed",
          description: "A track was removed from the station",
          variant: "default",
        });

        setStation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tracks: prev.tracks.filter((t) => t.id !== data.trackId),
            _count: {
              ...prev._count,
              tracks: Math.max(0, prev._count.tracks - 1),
            },
          };
        });
      });

      // Listen for station updates
      const unsubscribeStationUpdated = subscribe("station-updated", (data: any) => {
        toast({
          title: "Station updated",
          description: "Station settings have been updated",
          variant: "default",
        });

        setStation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            ...data.updates,
          };
        });
      });

      // Listen for playback updates
      const unsubscribePlaybackUpdated = subscribe("playback-updated", (data: any) => {
        console.log("Received playback update:", data);
        // Handle playback state synchronization here
      });

      // Store cleanup functions
      const cleanupFunctions = [
        unsubscribeUserJoined,
        unsubscribeUserLeft,
        unsubscribeTrackAdded,
        unsubscribeTrackRemoved,
        unsubscribeStationUpdated,
        unsubscribePlaybackUpdated
      ];

      // Return cleanup function
      return () => {
        console.log("🧹 Station socket effect cleanup");
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    } else {
      console.log("❌ Not joining station - missing requirements");
      return () => {}; // Empty cleanup if not joining
    }
  }, [
    isConnected,
    session,
    station,
    stationId,
    joinStation, // Now memoized
    leaveStation, // Now memoized  
    subscribe, // Now memoized
    toast,
    setStation,
  ]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (hasJoinedStationRef.current && currentStationIdRef.current) {
        const user = getAuthUser(session);
        if (user?.id) {
          console.log("🧹 Component unmounting - leaving station:", currentStationIdRef.current);
          leaveStation(currentStationIdRef.current, user.id);
          hasJoinedStationRef.current = false;
          currentStationIdRef.current = null;
        }
      }
    };
  }, []); // Empty deps - only run on unmount

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

  // Function to get tracks in the same order as displayed in UI
  const getUIOrderedTracks = (tracks: StationTrack[]) => {
    if (!tracks || tracks.length === 0) return [];

    const playingTrackIndex = tracks.findIndex((track) =>
      isTrackCurrentlyPlaying(track)
    );

    if (playingTrackIndex === -1) {
      // No currently playing track, return original order
      return tracks;
    }

    // Move playing track to the top (same as TrackList component)
    const playingTrack = tracks[playingTrackIndex];
    const otherTracks = tracks.filter(
      (_, index) => index !== playingTrackIndex
    );

    return [playingTrack, ...otherTracks];
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

      // Get tracks in the same order as displayed in UI
      const orderedTracks = getUIOrderedTracks(station.tracks);

      // Convert station tracks to Spotify Track objects (maintaining UI order)
      const spotifyTrackPromises = orderedTracks
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

      // Always clear the previous local playing track first
      console.log("🧹 Clearing previous local playing track");
      setLocalPlayingTrack(null);

      // Simple approach: just set the first station track as playing
      // since we're playing the station in its UI order
      const firstStationTrack = orderedTracks[0];
      if (firstStationTrack) {
        console.log(
          "🎯 Setting first station track as playing:",
          firstStationTrack.name
        );
        setTimeout(() => {
          setLocalPlayingTrack(firstStationTrack);
        }, 100);

        // Update database with station playing state (fire and forget)
        const firstSpotifyTrack = spotifyTracks[0];
        updateStationPlayingState(
          true,
          firstStationTrack.id,
          firstSpotifyTrack?.id
        ).catch(console.error);
      } else {
        console.log("❌ No tracks in station");
      }

      // Force refresh player state after a short delay
      setTimeout(async () => {
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
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      if (spotify) {
        const results = await spotify.search(
          searchQuery,
          ["track"],
          undefined,
          10
        );
        setSearchResults(results.tracks?.items || []);
      } else {
        const response = await fetch(
          `/api/spotify/search?query=${encodeURIComponent(
            searchQuery
          )}&type=track&limit=10`
        );
        if (!response.ok) throw new Error("Search request failed");
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
      const trackData = {
        trackId: track.id,
        name: track.name,
        artist: track.artists[0].name,
        imageUrl: track.album.images[0]?.url,
      };

      const response = await fetch(`/api/stations/${stationId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackData),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to add track");
      }

      addTrack(stationId, user.id, responseData);
      setSearchQuery("");
      setSearchResults([]);
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
      await startPlayback([trackData.uri], activeDevice.id || undefined);
      setTrack(trackData);

      setLocalPlayingTrack(track);
      updateStationPlayingState(
        true,
        track.id,
        trackData.id,
        trackData.name,
        trackData.artists[0]?.name,
        trackData.album.images[0]?.url
      ).catch(console.error);

      toast({
        title: "Playing track",
        description: `Playing "${track.name}"`,
      });
    } catch (error: any) {
      console.error("Error playing track:", error);
      let errorMessage = "Failed to play track";
      if (error?.message?.includes("No active device")) {
        errorMessage = "Please open Spotify on a device first";
      } else if (error?.message?.includes("Premium")) {
        errorMessage = "Spotify Premium required for playback control";
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

  const convertStationTrackToSpotifyTrack = async (
    stationTrack: StationTrack
  ): Promise<Track | null> => {
    const isRealSpotifyId = !stationTrack.trackId.startsWith("track-");

    if (isRealSpotifyId) {
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
      if (!stationTrack.name || !stationTrack.artist) return null;
      return await searchSpotifyTrack(stationTrack.name, stationTrack.artist);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
          {/* Debug buttons - remove this later */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDebugShowAnimation(!debugShowAnimation)}
            className="text-xs text-black mr-2"
          >
            {debugShowAnimation ? "Hide" : "Show"} Animation Test
          </Button>
        </div>

        {/* Station header */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Station image */}
          <div className="w-full md:w-1/3 relative group">
            <div
              className="h-48 sm:h-64 bg-cover bg-center rounded-lg overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-[1.02]"
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
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 leading-tight">
                  {station.name}
                </h1>
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

        {/* Main content with left/right panels on large screens */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Tracks & Members */}
          <div className="flex-1 lg:w-2/3">
            <Tabs defaultValue="tracks" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <TabsList className="bg-gray-800/60 p-1">
                  <TabsTrigger value="tracks">Tracks</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>

                <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 w-full sm:w-auto">
                  {!isUserMember() ? (
                    <>
                      <Button
                        onClick={handlePlayStation}
                        disabled={!station.tracks.length}
                        className="flex-1 sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                      >
                        <i className="bi bi-play-fill mr-2"></i>
                        <span className="hidden sm:inline">Play Station</span>
                        <span className="sm:hidden">Play</span>
                      </Button>
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
                    </>
                  ) : !isStationOwner() ? (
                    <>
                      <Button
                        onClick={handlePlayStation}
                        disabled={!station.tracks.length}
                        className="flex-1 sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                      >
                        <i className="bi bi-play-fill mr-2"></i>
                        <span className="hidden sm:inline">Play Station</span>
                        <span className="sm:hidden">Play</span>
                      </Button>
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
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handlePlayStation}
                        disabled={!station.tracks.length}
                        className="flex-1 sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                      >
                        <i className="bi bi-play-fill mr-2"></i>
                        <span className="hidden sm:inline">Play Station</span>
                        <span className="sm:hidden">Play</span>
                      </Button>
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
                    </>
                  )}
                </div>
              </div>

              <TabsContent value="tracks" className="space-y-4 mt-2">
                <TrackList
                  tracks={station.tracks}
                  isTrackCurrentlyPlaying={isTrackCurrentlyPlaying}
                  onPlayTrack={handlePlayTrack}
                  playingTrackId={playingTrackId}
                  debugShowAnimation={debugShowAnimation}
                  formatDate={formatDate}
                />
              </TabsContent>

              <TabsContent value="members" className="space-y-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Station Chat (only for members on lg+ screens) */}
          {isUserMember() && (
            <div className="hidden lg:block w-full lg:w-1/3">
              <div className="sticky top-6">
                <StationChat stationId={stationId} variant="panel" />
              </div>
            </div>
          )}
        </div>

        {/* Floating Chat for smaller screens */}
        {isUserMember() && (
          <div className="lg:hidden">
            <StationChat stationId={stationId} variant="floating" />
          </div>
        )}
      </div>
    </Container>
  );
}
