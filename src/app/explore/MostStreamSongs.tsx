import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setTrack } from "@/lib/redux/slices/playerSlices";
import { usePlayer } from "@/hooks/usePlayer";
import { useSpotify } from "@/hooks/useSpotify";
import { MostStreamedSong, SongFilters } from "@/types/song";
import { useSpotifySearch } from "@/hooks/useSpotifySearch";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { Track } from "@spotify/web-api-ts-sdk";
import { map, startCase } from "lodash";
import { Filter, FilterX, Play, Search, X, Pause, SkipForward, SkipBack, Clock, Music, List, Plus, Shuffle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

function MostStreamSongs({
  songs,
  filters,
  setFilters,
  onApplyFilters,
  isLoading = false,
}: {
  songs: MostStreamedSong[];
  filters: SongFilters;
  setFilters: (
    filters: SongFilters | ((prev: SongFilters) => SongFilters)
  ) => void;
  onApplyFilters: () => void;
  isLoading?: boolean;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchingTrack, setSearchingTrack] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchedTrack, setSearchedTrack] = useState<MostStreamedSong | null>(
    null
  );
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  // Store a map of track IDs to their search results for quick access
  const [trackSearchCache, setTrackSearchCache] = useState<
    Record<string, Track[]>
  >({});
  const dispatch = useAppDispatch();
  const { searchTrack } = useSpotifySearch();
  const { filterOptions, loading: optionsLoading } = useFilterOptions();
  const { 
    autoPlay, 
    toggleAutoPlay, 
    playQueueFromIndex, 
    track: currentPlayingTrack,
    hasNext,
    skipToNext,
    queue,
    trackStartTime,
    // Spotify Web API controls
    startPlayback,
    pausePlayback,
    skipToNextTrack,
    skipToPreviousTrack,
    addToQueue,
    getCurrentPlaybackState,
    // Real playback state
    spotifyPlaybackState,
    isPlaying,
    currentProgress
  } = usePlayer();
  const { client: spotify } = useSpotify();
  
  // Media control states
  const [currentTime, setCurrentTime] = useState(0);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const getTrackImage = (thumbnail: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(thumbnail), "text/html");
    const img = doc.querySelector("img");
    return img?.src || "";
  };

  // Update current time for progress tracking
  useEffect(() => {
    if (!currentPlayingTrack || !trackStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - trackStartTime;
      setCurrentTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPlayingTrack, trackStartTime]);

  // Format time in mm:ss
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Start playback using Spotify Web API
  const playSpotifyTrack = async (track: Track) => {
    try {
      // Get available devices to ensure we have an active device
      const devices = await getAvailableDevices();
      if (devices.length === 0) {
        toast({
          title: "No Active Device",
          description: "Please open Spotify on a device first",
          variant: "destructive",
        });
        return;
      }

      // Find the active device or use the first available one
      const activeDevice = devices.find(device => device.is_active) || devices[0];
      await startPlayback([track.uri], activeDevice.id || undefined);
      
      toast({
        title: "Now Playing",
        description: `${track.name} by ${track.artists[0].name}`,
      });
    } catch (error) {
      console.error('Error starting Spotify playback:', error);
      toast({
        title: "Playback Error",
        description: "Could not start playback. Make sure Spotify is open and you have Premium.",
        variant: "destructive",
      });
    }
  };

  // Play entire queue using Spotify Web API
  const playSpotifyQueue = async (tracks: Track[], startIndex: number = 0) => {
    try {
      // Get available devices to ensure we have an active device
      const devices = await getAvailableDevices();
      if (devices.length === 0) {
        toast({
          title: "No Active Device",
          description: "Please open Spotify on a device first",
          variant: "destructive",
        });
        return;
      }

      // Find the active device or use the first available one
      const activeDevice = devices.find(device => device.is_active) || devices[0];
      const uris = tracks.map(track => track.uri);
      await startPlayback(uris.slice(startIndex), activeDevice.id || undefined);
      
      toast({
        title: "Queue Started",
        description: `Playing ${tracks.length - startIndex} tracks`,
      });
    } catch (error) {
      console.error('Error starting Spotify queue:', error);
      toast({
        title: "Queue Error", 
        description: "Could not start queue playback. Make sure Spotify is open.",
        variant: "destructive",
      });
    }
  };

  // Get available devices
  const getAvailableDevices = async () => {
    try {
      if (!spotify) return [];
      const devices = await spotify.getAvailableDevices();
      console.log('Available devices:', devices);
      return devices.devices || [];
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    try {
      console.log('Toggle play/pause - current isPlaying:', isPlaying);
      
      // Check if we have any active devices
      const devices = await getAvailableDevices();
      if (devices.length === 0) {
        toast({
          title: "No Active Device",
          description: "Please open Spotify on a device first",
          variant: "destructive",
        });
        return;
      }

      // Find the active device or use the first available one
      const activeDevice = devices.find(device => device.is_active) || devices[0];
      const deviceId = activeDevice.id || undefined;

      if (isPlaying) {
        console.log('Attempting to pause playback...');
        await pausePlayback(deviceId);
      } else {
        console.log('Attempting to start playback...');
        await startPlayback(undefined, deviceId);
      }
    } catch (error: any) {
      console.error('Error toggling playback:', error);
      
      let errorMessage = "Could not control playback";
      if (error?.message?.includes('NO_ACTIVE_DEVICE')) {
        errorMessage = "No active Spotify device found. Please open Spotify.";
      } else if (error?.message?.includes('PREMIUM_REQUIRED')) {
        errorMessage = "Spotify Premium is required for playback control";
      } else if (error?.status === 403) {
        errorMessage = "Bad request - check your Spotify settings";
      } else if (error?.status === 404) {
        errorMessage = "No active device found";
      }
      
      toast({
        title: "Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
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
      // Get user profile to create playlist
      const userProfile = await spotify.getCurrentUserProfile();
      
      // Create playlist
      const playlist = await spotify.createPlaylist(userProfile.id, {
        name: playlistName,
        description: `Created from Song Symmetry search results - ${songs.length} tracks`,
        public: false
      });

      // Convert songs to Spotify track URIs
      const trackUris: string[] = [];
      
      for (const song of songs.slice(0, 50)) { // Limit to 50 tracks
        const cleanName = song.name?.replace(/<[^>]*>?/gm, "").trim() || "";
        const cleanArtist = song.artist?.replace(/<[^>]*>?/gm, "").trim() || "";
        
        if (!searchTrack) continue;
        
        const searchQuery = `${cleanName} ${cleanArtist}`;
        const results = await searchTrack(searchQuery);
        
        if (results && results.length > 0) {
          trackUris.push(results[0].uri);
        }
      }

      // Add tracks to playlist
      if (trackUris.length > 0) {
        await spotify.addItemsToPlaylist(playlist.id, trackUris);
        
        toast({
          title: "Success!",
          description: `Created playlist "${playlistName}" with ${trackUris.length} tracks`,
        });
        
        setShowPlaylistDialog(false);
        setPlaylistName("");
      }
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

  const handleSearchTrack = async (track: MostStreamedSong) => {
    if (!track.name || !track.artist) {
      toast({
        title: "Error",
        description: "Track information is incomplete",
        variant: "destructive",
      });
      return;
    }

    setSearchingTrack(track.id?.toString() || null);
    setSearchedTrack(track);

    try {
      // Clean up track name and artist to improve search results
      // Remove any HTML or special characters that might be in the data
      const cleanName = track.name?.replace(/<[^>]*>?/gm, "").trim() || "";
      const cleanArtist = track.artist?.replace(/<[^>]*>?/gm, "").trim() || "";

      // Check if Spotify client is initialized
      if (!searchTrack) {
        console.error("searchTrack function is not available");
        toast({
          title: "Error",
          description:
            "Spotify search is not available. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      // First search: Track name + artist name (for more accurate results)
      const combinedSearchQuery = `${cleanName} ${cleanArtist}`;
      console.log("Primary search (track+artist):", combinedSearchQuery);
      const combinedResults = await searchTrack(combinedSearchQuery);

      // Second search: Track name only (for more diverse results from different artists)
      // This shows different artists' interpretations of the same song title
      const trackNameQuery = `track:${cleanName}`;
      console.log("Secondary search (track name only):", trackNameQuery);
      const trackNameResults = await searchTrack(trackNameQuery);

      // Combine results, taking first 5 from combined search and up to 4 from track name search
      // We need to filter duplicates more carefully, considering both track ID and name/artist
      const primaryResults = combinedResults?.slice(0, 5) || [];

      // Create a set of track IDs from primary results
      const primaryIds = new Set(primaryResults.map((track) => track.id));

      // Also track name+artist combinations to catch duplicates that might have different IDs
      const trackSignatures = new Set(
        primaryResults.map(
          (track) =>
            `${track.name?.toLowerCase() || ""}:${
              track.artists[0]?.name?.toLowerCase() || ""
            }`
        )
      );

      // Filter secondary results to remove both exact ID duplicates and similar tracks
      const secondaryResults = (trackNameResults || [])
        .filter((track) => {
          // Check if this track ID is already in primary results
          if (primaryIds.has(track.id)) return false;

          // Check if there's a track with same name and artist (might be different version)
          const signature = `${track.name?.toLowerCase() || ""}:${
            track.artists[0]?.name?.toLowerCase() || ""
          }`;
          if (trackSignatures.has(signature)) return false;

          // Track is unique, add its signature to the set for future checks
          trackSignatures.add(signature);
          return true;
        })
        .slice(0, 4);

      // Combine the results
      const mergedResults = [...primaryResults, ...secondaryResults];

      if (mergedResults.length > 0) {
        console.log(
          "Found track matches:",
          mergedResults.length,
          "Primary matches:",
          primaryResults.length,
          "Secondary matches:",
          secondaryResults.length
        );

        // Store results and show the results dialog
        setSearchResults(mergedResults);

        // Cache the results for this track
        if (track.id) {
          setTrackSearchCache((prev) => ({
            ...prev,
            [track.id.toString()]: mergedResults,
          }));
        }

        setShowResultsDialog(true);
      } else {
        console.log("No results found for either search");
        toast({
          title: "No results",
          description: `Could not find "${cleanName}" by ${cleanArtist} on Spotify`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching for track:", error);
      toast({
        title: "Error",
        description: "Failed to search for track on Spotify",
        variant: "destructive",
      });
    } finally {
      setSearchingTrack(null);
    }
  };

  // Function to play a specific track from search results
  const playTrack = async (track: Track) => {
    console.log("Playing track:", track);

    // Make sure we have a valid track
    if (!track || !track.id) {
      console.error("Invalid track:", track);
      toast({
        title: "Error",
        description: "Invalid track data",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update Redux store for background image and UI state
      dispatch(setTrack(track));
      console.log("Track dispatched to Redux store");

      // Play the track using Spotify Web API
      await playSpotifyTrack(track);

      // Close the dialog
      setShowResultsDialog(false);
    } catch (error) {
      console.error("Error playing track:", error);
      toast({
        title: "Error",
        description: "Failed to play the track",
        variant: "destructive",
      });
    }
  };

  // Function to create a queue and play from a specific index
  const playWithQueue = async (selectedTrack: MostStreamedSong, songList: MostStreamedSong[]) => {
    const selectedIndex = songList.findIndex(song => song.id === selectedTrack.id);
    if (selectedIndex === -1) return;

    setPlayingTrack(selectedTrack.id!.toString());

    try {
      // Convert all songs to Spotify tracks for the queue
      const spotifyTracks: Track[] = [];
      
      for (let i = selectedIndex; i < Math.min(selectedIndex + 10, songList.length); i++) {
        const song = songList[i];
        const cleanName = song.name?.replace(/<[^>]*>?/gm, "").trim() || "";
        const cleanArtist = song.artist?.replace(/<[^>]*>?/gm, "").trim() || "";
        
        if (!searchTrack) continue;
        
        const searchQuery = `${cleanName} ${cleanArtist}`;
        const results = await searchTrack(searchQuery);
        
        if (results && results.length > 0) {
          spotifyTracks.push(results[0]);
        }
      }

      if (spotifyTracks.length > 0) {
        // Update Redux store for background image and UI state (first track)
        dispatch(setTrack(spotifyTracks[0]));
        
        // Use Spotify Web API to play the queue
        await playSpotifyQueue(spotifyTracks, 0);
        // Also update our Redux state for UI consistency
        playQueueFromIndex(spotifyTracks, 0);
      }
    } catch (error) {
      console.error("Error creating queue:", error);
      toast({
        title: "Error",
        description: "Failed to create playlist queue",
        variant: "destructive",
      });
    } finally {
      setPlayingTrack(null);
    }
  };

  // Function to add all search results to the Spotify queue
  const addAllToQueue = async () => {
    if (searchResults.length === 0) {
      toast({
        title: "No Results",
        description: "No search results to add to queue",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get available devices to ensure we have an active device
      const devices = await getAvailableDevices();
      if (devices.length === 0) {
        toast({
          title: "No Active Device",
          description: "Please open Spotify on a device first",
          variant: "destructive",
        });
        return;
      }

      // Find the active device or use the first available one
      const activeDevice = devices.find(device => device.is_active) || devices[0];
      const deviceId = activeDevice.id || undefined;

      // Add each track to the queue
      let addedCount = 0;
      for (const track of searchResults) {
        try {
          await addToQueue(track.uri, deviceId);
          addedCount++;
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error adding track ${track.name} to queue:`, error);
        }
      }

      if (addedCount > 0) {
        toast({
          title: "Added to Queue",
          description: `Successfully added ${addedCount} tracks to your Spotify queue`,
        });
        setShowResultsDialog(false);
      } else {
        toast({
          title: "Queue Error",
          description: "Failed to add tracks to queue",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding tracks to queue:", error);
      toast({
        title: "Queue Error",
        description: "Failed to add tracks to queue. Make sure Spotify is open.",
        variant: "destructive",
      });
    }
  };

  // Function to directly play a track from the most streamed songs list
  const directPlay = async (track: MostStreamedSong) => {
    if (!track.id) return;

    setPlayingTrack(track.id.toString());

    try {
      // Check if we already have cached search results for this track
      if (trackSearchCache[track.id.toString()]?.length > 0) {
        // Use cached results
        const cachedResults = trackSearchCache[track.id.toString()];
        console.log("Using cached search results for quick play:", track.name);

        // Update Redux store for background image and UI state
        dispatch(setTrack(cachedResults[0]));

        // If auto-play is enabled, create a queue
        if (autoPlay) {
          playWithQueue(track, songs);
        } else {
          // Use Spotify Web API for direct playback
          await playSpotifyTrack(cachedResults[0]);
        }
      } else {
        // Need to search first
        const cleanName = track.name?.replace(/<[^>]*>?/gm, "").trim() || "";
        const cleanArtist =
          track.artist?.replace(/<[^>]*>?/gm, "").trim() || "";

        if (!searchTrack) {
          throw new Error("Search function not available");
        }

        // Run a more targeted search for direct play (using track + artist)
        const searchQuery = `${cleanName} ${cleanArtist}`;
        console.log("Searching for direct play:", searchQuery);
        const results = await searchTrack(searchQuery);

        if (results && results.length > 0) {
          // Also do the secondary search for caching and variety
          // Search by track name only to find different artists' interpretations
          const trackNameQuery = `track:${cleanName}`;
          const trackNameResults = await searchTrack(trackNameQuery);

          // Combine results as we do in handleSearchTrack
          const primaryResults = results.slice(0, 5);

          // Use the improved duplicate detection logic
          const primaryIds = new Set(primaryResults.map((track) => track.id));

          // Also track name+artist combinations to catch duplicates with different IDs
          const trackSignatures = new Set(
            primaryResults.map(
              (track) =>
                `${track.name?.toLowerCase() || ""}:${
                  track.artists[0]?.name?.toLowerCase() || ""
                }`
            )
          );

          const secondaryResults = (trackNameResults || [])
            .filter((track) => {
              // Check if this track ID is already in primary results
              if (primaryIds.has(track.id)) return false;

              // Check if there's a track with same name and artist (might be different version)
              const signature = `${track.name?.toLowerCase() || ""}:${
                track.artists[0]?.name?.toLowerCase() || ""
              }`;
              if (trackSignatures.has(signature)) return false;

              // Track is unique, add its signature to the set for future checks
              trackSignatures.add(signature);
              return true;
            })
            .slice(0, 4);

          const mergedResults = [...primaryResults, ...secondaryResults];

          // Cache the combined results
          setTrackSearchCache((prev) => ({
            ...prev,
            [track.id!.toString()]: mergedResults,
          }));

          // Update Redux store for background image and UI state
          dispatch(setTrack(results[0]));

          // If auto-play is enabled, create a queue, otherwise just play the track
          if (autoPlay) {
            playWithQueue(track, songs);
          } else {
            // Use Spotify Web API for direct playback
            await playSpotifyTrack(results[0]);
          }
        } else {
          toast({
            title: "No results",
            description: `Could not find "${cleanName}" by ${cleanArtist} on Spotify`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error in direct play:", error);
      toast({
        title: "Error",
        description: "Failed to play the track",
        variant: "destructive",
      });
    } finally {
      setPlayingTrack(null);
    }
  };

  // Clear specific filter
  const clearFilter = (filterKey: keyof SongFilters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: filterKey === 'limit' ? 50 : filterKey === 'genre' || filterKey === 'language' ? undefined : ""
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      limit: 50,
      year: "",
      genre: undefined,
      language: undefined,
      artist: "",
      name: "",
    });
    setSearchTerm("");
  };

  // Check if any filters are applied
  const hasActiveFilters = filters.year || filters.genre || filters.language || filters.artist || filters.name || searchTerm;

  // Filter songs based on search term
  const filteredSongs = songs.filter(song => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (song.name && song.name.toLowerCase().includes(search)) ||
      (song.artist && song.artist.toLowerCase().includes(search)) ||
      (song.genre && song.genre.toLowerCase().includes(search)) ||
      (song.year && song.year.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Most Streamed Songs</h2>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search songs, artists, genres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Song Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Song Name
                </label>
                <Input
                  type="text"
                  placeholder="Search by name"
                  value={filters.name || ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      name: name === "" ? "" : name,
                    }));
                  }}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Artist
                </label>
                <Input
                  type="text"
                  placeholder="Search by artist"
                  value={filters.artist || ""}
                  onChange={(e) => {
                    const artist = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      artist: artist === "" ? "" : artist,
                    }));
                  }}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              {/* Genre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genre
                </label>
                <Select
                  value={filters.genre?.[0] || "all-genres"}
                  onValueChange={(value) => {
                    setFilters((prev) => ({
                      ...prev,
                      genre: value === "all-genres" ? undefined : [value],
                    }));
                  }}
                  disabled={optionsLoading}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="All genres" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all-genres">All genres</SelectItem>
                    {filterOptions.genres.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {startCase(genre)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year
                </label>
                <Select
                  value={filters.year || "all-years"}
                  onValueChange={(value) => {
                    setFilters((prev) => ({
                      ...prev,
                      year: value === "all-years" ? "" : value,
                    }));
                  }}
                  disabled={optionsLoading}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all-years">All years</SelectItem>
                    {filterOptions.years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language
                </label>
                <Select
                  value={filters.language?.[0] || "all-languages"}
                  onValueChange={(value) => {
                    setFilters((prev) => ({
                      ...prev,
                      language: value === "all-languages" ? undefined : [value],
                    }));
                  }}
                  disabled={optionsLoading}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="All languages" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all-languages">All languages</SelectItem>
                    {filterOptions.languages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {startCase(language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Results Limit
                </label>
                <Select
                  value={filters.limit?.toString() || "50"}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="25">25 songs</SelectItem>
                    <SelectItem value="50">50 songs</SelectItem>
                    <SelectItem value="100">100 songs</SelectItem>
                    <SelectItem value="200">200 songs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex flex-wrap gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="gap-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <FilterX className="w-4 h-4" />
                    Clear All
                  </Button>
                )}
                
                {/* Individual filter badges */}
                {filters.name && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    onClick={() => clearFilter('name')}
                  >
                    Name: {filters.name}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                
                {filters.artist && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                    onClick={() => clearFilter('artist')}
                  >
                    Artist: {filters.artist}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                
                {filters.year && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-yellow-600 text-white hover:bg-yellow-700 cursor-pointer"
                    onClick={() => clearFilter('year')}
                  >
                    Year: {filters.year}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                
                {filters.genre && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                    onClick={() => clearFilter('genre')}
                  >
                    Genre: {startCase(filters.genre[0])}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                
                {filters.language && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                    onClick={() => clearFilter('language')}
                  >
                    Language: {startCase(filters.language[0])}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
              </div>

              <Button
                onClick={onApplyFilters}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Searching..." : "Apply Filters"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          {filteredSongs.length} songs found
          {hasActiveFilters && ` (filtered from ${songs.length})`}
        </p>
        
        {filteredSongs.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              onClick={() => setShowPlaylistDialog(true)}
            >
              <Plus className="w-4 h-4" />
              Create Playlist
            </Button>
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
            <div className="text-sm text-gray-400">
              This will create a playlist with {Math.min(songs.length, 50)} tracks from your current search results.
            </div>
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
      {/* Songs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-gray-700 rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {map(filteredSongs, (track, index) => (
              <div
                className={`
            relative
            text-white
            font-sans
            cursor-pointer
            group

            before:content-[''] 
            before:absolute 
            before:rounded-full 
            before:w-[6rem] 
            before:h-[6rem] 
            before:top-[30%] 
            before:right-[7%]

            after:content-[''] 
            after:absolute 
            after:h-[3rem] 
            after:top-[8%] 
            after:left-[5%] 
            after:border 
            after:border-solid 
            after:border-white/50
          `}
                style={{
                  backgroundImage: `url(${getTrackImage(
                    String(track.thumbnail)
                  )})`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  borderRadius: "0.7rem",
                }}
                key={track.id}
                onClick={() => handleSearchTrack(track)}
              >
                <div
                  className="
              h-[14rem]
              p-4
              bg-[rgba(255,255,255,0.074)]
              border
              border-[rgba(255,255,255,0.222)]
              backdrop-blur-[20px]
              rounded-[0.7rem]
              flex
              flex-col
              justify-between
              transition-all
              ease-in-out
              duration-300
      
              hover:shadow-[0_0_20px_1px_#ffbb763f]
              hover:border-[rgba(255,255,255,0.454)]
              relative
            "
                >
                  {/* Rank number floating above the card at top left */}
                  <div className="absolute -top-2 -left-2 p-1 px-2 bg-black/70 backdrop-blur-sm rounded-full text-xs font-bold shadow-md z-10">
                    #{index + 1}
                  </div>

                  {searchingTrack === track.id?.toString() ? (
                    <div className="absolute top-2 right-2 p-1 bg-black/50 backdrop-blur-sm rounded-full transition-colors opacity-100">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 p-1 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100">
                      <Search className="h-5 w-5" />
                    </div>
                  )}

                  {/* Play button in bottom right */}
                  {playingTrack === track.id?.toString() ? (
                    <div className="absolute bottom-2 right-2 p-2 bg-green-600/90 backdrop-blur-sm rounded-full transition-colors opacity-100 z-10">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  ) : (
                    <div
                      className="absolute bottom-2 right-2 p-2 bg-green-500/80 backdrop-blur-sm rounded-full hover:bg-green-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        directPlay(track);
                      }}
                    >
                      <Play className="h-5 w-5" />
                    </div>
                  )}

                  <span className="text-2xl font-medium line-clamp-3 text-ellipsis overflow-hidden">
                    {track.name}
                  </span>
                  <div>
                    <strong className="block mb-2 line-clamp-3 text-ellipsis overflow-hidden">
                      {track.artist}
                    </strong>
                    <p className="m-0 text-[0.7em] font-light">
                      {track.streamCount
                        ? `${new Intl.NumberFormat("de-DE").format(
                            track.streamCount
                          )} streams`
                        : ""}
                    </p>
                    <span className="text-[0.8rem] font-light mr-[0.2rem]">
                      {track.genre}
                    </span>
                    <span className="text-[0.6rem] font-light">
                      | {track.year}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredSongs.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No songs found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search criteria or filters
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      )}

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Search Results for:{" "}
              {searchedTrack?.name?.replace(/<[^>]*>?/gm, "").trim()} by{" "}
              {searchedTrack?.artist?.replace(/<[^>]*>?/gm, "").trim()}
            </DialogTitle>
            <div className="flex items-center justify-between mt-2">
              <div className="flex space-x-2">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    if (searchResults.length > 0) {
                      console.log(
                        "Playing first result:",
                        searchResults[0].name
                      );
                      playTrack(searchResults[0]);
                    }
                  }}
                  disabled={searchResults.length === 0}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play First Result
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={addAllToQueue}
                  disabled={searchResults.length === 0}
                >
                  <List className="h-4 w-4 mr-2" />
                  Add All to Queue
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6">
            {searchResults.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-lg text-gray-300">No results found</p>
                <p className="text-sm text-gray-400">
                  Try a different search or check your Spotify connection
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {searchResults.map((track) => (
                  <Card
                    key={track.id}
                    className="flex p-4 items-center space-x-4 bg-gray-800 hover:bg-gray-700 border-gray-700 transition-colors cursor-pointer text-white"
                    onClick={() => playTrack(track)}
                  >
                    <img
                      src={track.album.images[0]?.url || ""}
                      alt={track.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-white">
                          {track.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-300">
                        {track.artists.map((a) => a.name).join(", ")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {track.album.name} •{" "}
                        {new Date(track.album.release_date).getFullYear()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={async (e) => {
                          e.stopPropagation(); // Prevent card click
                          e.preventDefault();
                          
                          try {
                            // Get available devices
                            const devices = await getAvailableDevices();
                            if (devices.length === 0) {
                              toast({
                                title: "No Active Device",
                                description: "Please open Spotify on a device first",
                                variant: "destructive",
                              });
                              return;
                            }

                            const activeDevice = devices.find(device => device.is_active) || devices[0];
                            await addToQueue(track.uri, activeDevice.id || undefined);
                            
                            toast({
                              title: "Added to Queue",
                              description: `Added "${track.name}" to your Spotify queue`,
                            });
                          } catch (error) {
                            console.error("Error adding track to queue:", error);
                            toast({
                              title: "Queue Error",
                              description: "Failed to add track to queue",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="default"
                        className="rounded-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          e.preventDefault();
                          console.log(
                            "Play button clicked for track:",
                            track.name
                          );
                          playTrack(track);
                        }}
                      >
                        <Play className="h-5 w-5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MostStreamSongs;
