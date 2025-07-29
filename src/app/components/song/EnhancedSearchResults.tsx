/* eslint-disable @next/next/no-img-element */
import React, { memo, useState } from 'react';
import { Track } from "@spotify/web-api-ts-sdk";
import TracksGrid from "../TracksGrid";
import { Loader } from "../core/Loader";
import { useAISearch } from '@/hooks/useAISearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlayer } from "@/hooks/usePlayer";
import { useToast } from "@/hooks/use-toast";
import { Play } from "lucide-react";

interface EnhancedSearchResultsProps {
  searchQuery: string;
  searchResult?: Track[];
  yourTopTracks?: Track[];
  isLoading: boolean;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClickRecommendTrack: (track: Track) => void;
}

interface AISearchResult {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  relevanceScore: number;
  explanation: string;
  spotifyTrack?: Track;
}

const AIResultItem = memo(({ 
  result, 
  onClick,
  onPlay
}: { 
  result: AISearchResult, 
  onClick: () => void,
  onPlay?: (track: Track) => void
}) => (
  <div className="w-full flex flex-col" key={`${result.title}-${result.artist}`}>
    <div className="w-full flex flex-row space-x-4 justify-start items-center p-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 border border-gray-200 hover:border-purple-300 transition-all duration-300 group">
      {/* Album Art or Icon */}
      {result.spotifyTrack?.album?.images?.[0] ? (
        <img
          src={result.spotifyTrack.album.images[0].url}
          alt={result.title}
          className="w-[48px] h-[48px] rounded-lg object-cover shadow-lg group-hover:shadow-xl transition-shadow duration-300"
        />
      ) : (
        <div className="w-[48px] h-[48px] bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
          <i className="bi bi-music-note-beamed text-white text-xl" />
        </div>
      )}
      
      <div className="flex flex-col grow space-y-1 cursor-pointer" onClick={onClick}>
        <h2 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
          {result.spotifyTrack?.name || result.title}
        </h2>
        <h2 className="text-sm font-medium text-gray-600">
          {result.spotifyTrack?.artists?.map(a => a.name).join(", ") || result.artist}
          {result.spotifyTrack?.album?.name && ` • ${result.spotifyTrack.album.name}`}
          {result.spotifyTrack?.album?.release_date && ` (${new Date(result.spotifyTrack.album.release_date).getFullYear()})`}
        </h2>
        <p className="text-sm text-gray-500 italic line-clamp-2">{result.explanation}</p>
        <div className="flex gap-2 mt-2">
          <Badge className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200">
            {result.relevanceScore}% match
          </Badge>
          {result.genre && (
            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
              {result.genre}
            </Badge>
          )}
          {!result.spotifyTrack && (
            <Badge variant="destructive" className="text-xs">
              Not on Spotify
            </Badge>
          )}
        </div>
      </div>
      
      {/* Play Button */}
      {result.spotifyTrack && onPlay && (
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full w-10 h-10 hover:bg-purple-600 hover:text-white transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(result.spotifyTrack!);
          }}
        >
          <Play className="w-5 h-5" />
        </Button>
      )}
      
      <i className="bi bi-chevron-right text-gray-400 text-xl group-hover:text-purple-600 group-hover:translate-x-1 transition-all duration-300" />
    </div>
  </div>
));

AIResultItem.displayName = 'AIResultItem';

const TrackItem = memo(({ track, onClick }: { track: Track, onClick: () => void }) => (
  <div className="w-full flex flex-col" key={track.id}>
    <div
      className="w-full flex flex-row space-x-4 justify-start items-center px-2 py-1 rounded-md hover:bg-gray-100 cursor-pointer"
      onClick={onClick}
    >
      <img
        width={100}
        height={100}
        className="w-[40px] h-[40px] object-contain rounded-md"
        src={track.album.images[0]?.url}
        alt=""
        loading="lazy"
      />
      <div className="flex flex-col grow space-y-1">
        <h2 className="text-lg font-bold text-gray-900">
          {track.name}
        </h2>
        <h2 className="text-md font-normal text-gray-500 overflow-hidden text-ellipsis">
          {track.artists.map((artist) => artist.name).join(", ")}
        </h2>
      </div>
      <i className="bi bi-chevron-right text-gray-400 text-2xl" />
    </div>
  </div>
));

TrackItem.displayName = 'TrackItem';

const EnhancedSearchResults = memo(({
  searchQuery,
  searchResult,
  yourTopTracks,
  isLoading,
  onQueryChange,
  onClickRecommendTrack
}: EnhancedSearchResultsProps) => {
  const [activeTab, setActiveTab] = useState<"spotify" | "ai">("spotify");
  const [aiResults, setAIResults] = useState<AISearchResult[]>([]);
  const { searchSongs, isLoading: isAILoading } = useAISearch();
  const { startPlayback } = usePlayer();
  const { toast } = useToast();

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    
    const results = await searchSongs(searchQuery);
    
    // Fetch Spotify data for each result
    const resultsWithSpotify = await Promise.all(
      results.map(async (result) => {
        try {
          const response = await fetch(
            `/api/spotify/search?query=${encodeURIComponent(
              `${result.title} ${result.artist}`
            )}&type=track&limit=1`
          );
          const data = await response.json();
          
          if (data.tracks?.items?.[0]) {
            return { ...result, spotifyTrack: data.tracks.items[0] };
          }
        } catch (error) {
          console.error('Error fetching Spotify data:', error);
        }
        return result;
      })
    );
    
    setAIResults(resultsWithSpotify);
  };

  const handlePlayTrack = async (track: Track) => {
    try {
      await startPlayback([track.uri]);
      toast({
        title: "Now Playing",
        description: `${track.name} by ${track.artists[0].name}`,
      });
    } catch (error) {
      console.error('Error playing track:', error);
      toast({
        title: "Playback Error",
        description: "Could not start playback. Make sure Spotify is open.",
        variant: "destructive",
      });
    }
  };

  const handleAIResultClick = (result: AISearchResult) => {
    if (result.spotifyTrack) {
      onClickRecommendTrack(result.spotifyTrack);
    } else {
      toast({
        title: "Song Not Found",
        description: `"${result.title}" by ${result.artist} is not available on Spotify.`,
        variant: "destructive",
      });
    }
  };

  if (isLoading && activeTab === "spotify") return <Loader />;
  
  return (
    <>
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="w-full flex flex-col space-y-2 justify-center items-center">
          <h1 className="text-4xl font-bold text-white flex">
            Song Symmetry
          </h1>
          <h2 className="text-lg font-light text-gray-300 flex">
            Find Songs in the Same Vibes
          </h2>
        </div>
      </div>
      <div className="w-full flex flex-col space-y-4 justify-center items-center">
        <div className="flex flex-col gap-4 w-80 sm:w-[600px]">
          <input
            className="flex w-full h-14 text-white rounded-md border border-white border-input bg-background px-3 py-2 text-sm sm:text-md md:text-lg select-none ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type a song name or describe what you're looking for"
            type="text"
            value={searchQuery}
            onChange={onQueryChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && activeTab === 'ai') {
                handleAISearch();
              }
            }}
          />
          
          {searchQuery && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "spotify" | "ai")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="spotify" className="flex items-center gap-2">
                  <i className="bi bi-spotify" />
                  Spotify Search
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <i className="bi bi-robot" />
                  AI Search
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="spotify" className="mt-4">
                {searchResult && (
                  <div className="max-h-[400px] sm:max-h-[600px] overflow-y-scroll rounded-md flex flex-col p-4 space-y-2 bg-white">
                    {searchResult.map((track) => (
                      <TrackItem 
                        key={track.id} 
                        track={track} 
                        onClick={() => onClickRecommendTrack(track)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="ai" className="mt-4 space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-3 rounded-lg border border-purple-500/20">
                    <p className="text-sm text-gray-200 flex items-center gap-2">
                      <i className="bi bi-lightbulb text-yellow-400"></i>
                      Try searches like &quot;vibes like olivia rodrigo&quot; or &quot;hype kpop for working out&quot;
                    </p>
                  </div>
                  <Button 
                    onClick={handleAISearch} 
                    disabled={isAILoading || !searchQuery.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    {isAILoading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-stars mr-2" />
                        Search with AI
                      </>
                    )}
                  </Button>
                </div>
                
                {aiResults.length > 0 && (
                  <div className="max-h-[400px] sm:max-h-[600px] overflow-y-auto rounded-lg flex flex-col p-4 space-y-3 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <i className="bi bi-stars text-purple-500"></i>
                        AI Search Results
                      </h3>
                      <span className="text-xs text-gray-500">{aiResults.length} results</span>
                    </div>
                    {aiResults.map((result, idx) => (
                      <AIResultItem 
                        key={idx} 
                        result={result} 
                        onClick={() => handleAIResultClick(result)}
                        onPlay={handlePlayTrack}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
        
        {!searchQuery && (
          <div className="w-full flex flex-col space-y-4">
            <h3 className="text-md font-medium text-white">
              Or Find Similar Song to Your Top Tracks
            </h3>
            {yourTopTracks && (
              <TracksGrid
                tracks={yourTopTracks}
                onClickTrack={onClickRecommendTrack}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
});

EnhancedSearchResults.displayName = 'EnhancedSearchResults';

export default EnhancedSearchResults;