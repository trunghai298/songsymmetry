import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setTrack } from "@/lib/redux/slices/playerSlices";
import { MostStreamedSong, SongFilters } from "@/types/song";
import { useSpotifySearch } from "@/hooks/useSpotifySearch";
import { Track } from "@spotify/web-api-ts-sdk";
import { map, startCase } from "lodash";
import { Filter, FilterX, Play, Search, X } from "lucide-react";
import { useState } from "react";
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
  setFilters: (filters: SongFilters | ((prev: SongFilters) => SongFilters)) => void;
  onApplyFilters: () => void;
  isLoading?: boolean;
}) {
  const [openFilter, setOpenFilter] = useState(false);
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

  const getTrackImage = (thumbnail: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(thumbnail), "text/html");
    const img = doc.querySelector("img");
    return img?.src || "";
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
      
      // Second search: Artist name only (for more diverse results)
      const artistSearchQuery = `artist:${cleanArtist}`;
      console.log("Secondary search (artist only):", artistSearchQuery);
      const artistResults = await searchTrack(artistSearchQuery);
      
      // Combine results, taking first 5 from combined search and up to 4 from artist search
      // We need to filter duplicates more carefully, considering both track ID and name/artist
      const primaryResults = combinedResults?.slice(0, 5) || [];
      
      // Create a set of track IDs from primary results
      const primaryIds = new Set(primaryResults.map(track => track.id));
      
      // Also track name+artist combinations to catch duplicates that might have different IDs
      const trackSignatures = new Set(
        primaryResults.map(track => `${track.name.toLowerCase()}:${track.artists[0].name.toLowerCase()}`)
      );
      
      // Filter secondary results to remove both exact ID duplicates and similar tracks
      const secondaryResults = (artistResults || [])
        .filter(track => {
          // Check if this track ID is already in primary results
          if (primaryIds.has(track.id)) return false;
          
          // Check if there's a track with same name and artist (might be different version)
          const signature = `${track.name?.toLowerCase() || ''}:${track.artists[0]?.name?.toLowerCase() || ''}`;
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
  const playTrack = (track: Track) => {
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

    // Dispatch the track to the Redux store
    try {
      dispatch(setTrack(track));
      console.log("Track dispatched to Redux store");

      // toast({
      //   title: "Playing track",
      //   description: `Now playing ${track.name} by ${track.artists[0].name}`,
      // });

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

        // Play the first result
        playTrack(cachedResults[0]);
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
          // Also do the secondary search for caching purposes
          const artistSearchQuery = `artist:${cleanArtist}`;
          const artistResults = await searchTrack(artistSearchQuery);
          
          // Combine results as we do in handleSearchTrack
          const primaryResults = results.slice(0, 5);
          
          // Use the improved duplicate detection logic
          const primaryIds = new Set(primaryResults.map(track => track.id));
          
          // Also track name+artist combinations to catch duplicates with different IDs
          const trackSignatures = new Set(
            primaryResults.map(track => `${track.name?.toLowerCase() || ''}:${track.artists[0]?.name?.toLowerCase() || ''}`)
          );
          
          const secondaryResults = (artistResults || [])
            .filter(track => {
              // Check if this track ID is already in primary results
              if (primaryIds.has(track.id)) return false;
              
              // Check if there's a track with same name and artist (might be different version)
              const signature = `${track.name?.toLowerCase() || ''}:${track.artists[0]?.name?.toLowerCase() || ''}`;
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

          // But still play the first result from the primary search
          playTrack(results[0]);
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

  return (
    <div className="w-full flex flex-col space-y-4 relative">
      <h2 className="text-2xl text-white font-bold">Most Streamed Songs</h2>
      <div className="w-full flex flex-row justify-between">
        <div className="flex flex-row space-x-2 items-center">
          {Object.entries(filters).map(([key, value]) => (
            <div key={key} className="flex flex-row space-x-1">
              {key === "limit" && (
                <Badge className="font-medium text-white" variant="outline">
                  Total Songs: {songs.length}
                </Badge>
              )}
              {key !== "limit" && value && (
                <Badge className="font-medium text-white" variant="outline">
                  {startCase(key)} :{" "}
                  {typeof value === "object" ? value.join(", ") : value}
                </Badge>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-row space-x-2">
          {openFilter ? (
            <FilterX
              className="cursor-pointer"
              onClick={() => setOpenFilter(false)}
            />
          ) : (
            <Filter
              className="cursor-pointer"
              onClick={() => setOpenFilter(true)}
            />
          )}
        </div>
      </div>
      {openFilter && (
        <div className="w-full flex flex-row space-x-2 transition-all duration-300">
          <form 
            className="w-full" 
            onSubmit={(e) => {
              e.preventDefault();
              onApplyFilters();
            }}
          >
            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="relative">
              <Input
                className="user-select-none pr-10"
                type="text"
                placeholder="Search by name"
                value={filters.name || ""}
                onChange={(e) => {
                  const name = e.target.value;
                  // Just update local state but don't trigger filtering yet
                  setFilters((prev) => ({
                    ...prev,
                    name: name === "" ? undefined : name,
                  }));
                }}
              />
            </div>
            <div className="relative">
              <Input
                className="pr-10"
                type="text"
                placeholder="Search by artist, comma separated"
                value={filters.artist || ""}
                onChange={(e) => {
                  const names = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    artist: names === "" ? undefined : names,
                  }));
                }}
              />
            </div>
            <div className="relative">
              <Input
                className="pr-10"
                type="text"
                placeholder="Search by genre, comma separated"
                value={filters.genre ? filters.genre.join(",") : ""}
                onChange={(e) => {
                  const genre = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    genre:
                      genre === "" ? undefined : Array.from(genre.split(",")),
                  }));
                }}
              />
            </div>
            <div className="relative">
              <Input
                className="pr-10"
                type="text"
                placeholder="Search by year"
                value={filters.year || ""}
                onChange={(e) => {
                  const year = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    year: year === "" ? undefined : year,
                  }));
                }}
              />
            </div>
            <div className="relative">
              <Input
                className="pr-10"
                type="text"
                placeholder="Search by language, comma separated"
                value={filters.language ? filters.language.join(",") : ""}
                onChange={(e) => {
                  const language = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    language:
                      language === ""
                        ? undefined
                        : Array.from(language.split(",")),
                  }));
                }}
              />
            </div>
            <div className="flex space-x-2">
              <Input
                className="pr-10"
                type="number"
                placeholder="Number of songs"
                value={filters.limit || ""}
                onChange={(e) => {
                  const limit = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    limit: limit === "" ? undefined : Number(limit),
                  }));
                }}
              />
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={onApplyFilters}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </Button>
            </div>
            </div>
          </form>
        </div>
      )}
      <div className="flex flex-row space-x-2">
        {isLoading ? (
          <div className="w-full flex items-center justify-center mt-12 mb-12">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
              <p className="text-white mt-4">Loading songs...</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {map(songs, (track, index) => (
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
      </div>

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
                  className="bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
                  onClick={() => {
                    setShowResultsDialog(false);
                    toast({
                      title: "Feature coming soon",
                      description: "Adding to queue is not yet available",
                    });
                  }}
                >
                  Add to Queue
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
