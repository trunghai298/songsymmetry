"use client";

import React, { useState } from "react";
import Container from "../components/core/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAISearch } from "@/hooks/useAISearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader } from "../components/core/Loader";
import AIRecommendations from "../components/AIRecommendations";
import SongSimilarityComparison from "../components/SongSimilarityComparison";
import { Track } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/navigation";
import { Brain, Search, Sparkles, TrendingUp, Play } from "lucide-react";
import { usePlayer } from "@/hooks/usePlayer";
import { useToast } from "@/hooks/use-toast";

interface AISongResult {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  relevanceScore: number;
  explanation: string;
  spotifyTrack?: Track; // Add Spotify track data
}

export default function AISearchPage() {
  const router = useRouter();
  const { startPlayback } = usePlayer();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AISongResult[]>([]);
  const { searchSongs, isLoading } = useAISearch();

  const handleSearch = async () => {
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
    
    setSearchResults(resultsWithSpotify);
  };

  const handleResultClick = (result: AISongResult) => {
    if (result.spotifyTrack) {
      router.push(`/?trackId=${result.spotifyTrack.id}`);
    }
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

  const handleTrackClick = (track: Track) => {
    router.push(`/?trackId=${track.id}`);
  };

  const exampleQueries = [
    { text: "trending kpop like newjeans", icon: "🇰🇷" },
    { text: "chill r&b vibes like sza", icon: "🎧" },
    { text: "uk drill and afrobeats mix", icon: "🇬🇧" },
    { text: "viral tiktok dance songs", icon: "📱" },
    { text: "indie bedroom pop aesthetic", icon: "🌙" },
    { text: "y2k throwback like doja cat", icon: "✨" }
  ];

  return (
    <Container>
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full">
              <Brain className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white">AI Music Discovery</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Use natural language to find songs, get personalized recommendations, and compare music with AI
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 h-auto bg-gray-800 border border-gray-700">
            <TabsTrigger 
              value="search" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-3"
            >
              <Search className="w-4 h-4" />
              AI Search
            </TabsTrigger>
            <TabsTrigger 
              value="recommendations" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-3"
            >
              <Sparkles className="w-4 h-4" />
              Recommendations
            </TabsTrigger>
            <TabsTrigger 
              value="compare" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white py-3"
            >
              <TrendingUp className="w-4 h-4" />
              Compare Songs
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-6 space-y-6">
            <Card className="bg-gray-900 border-gray-700 max-w-7xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white">Natural Language Search</CardTitle>
                <CardDescription>
                  Describe what you&apos;re looking for in your own words
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Try: 'upbeat songs for running' or 'music like The Beatles'"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="bg-gray-800 border-gray-600 text-white flex-1"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isLoading || !searchQuery.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {/* Example queries */}
                <div className="space-y-3">
                  <p className="text-sm text-gray-400 font-medium">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {exampleQueries.map((query, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery(query.text);
                          setSearchResults([]);
                        }}
                        className="text-xs border-gray-700 text-gray-300 bg-gray-800/50 hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-blue-600/20 hover:border-purple-500/50 hover:text-white transition-all duration-300 backdrop-blur-sm group"
                      >
                        <span className="mr-1.5 text-base group-hover:scale-110 transition-transform duration-300">{query.icon}</span>
                        <span className="px-1">{query.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <>
                    <div className="mb-4 text-sm text-gray-400">
                      Found {searchResults.length} results
                    </div>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="group relative bg-gray-800/50 rounded-lg border border-gray-700 hover:border-purple-500/50 hover:bg-gray-800/70 transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20 overflow-hidden"
                        >
                          {/* Album Art Section */}
                          <div className="relative aspect-[4/3] overflow-hidden bg-gray-900">
                            {result.spotifyTrack?.album?.images?.[0] ? (
                              <img
                                src={result.spotifyTrack.album.images[0].url}
                                alt={result.title}
                                className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                onClick={() => handleResultClick(result)}
                              />
                            ) : (
                              <div 
                                className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center cursor-pointer"
                                onClick={() => handleResultClick(result)}
                              >
                                <i className="bi bi-music-note-beamed text-white text-4xl" />
                              </div>
                            )}
                            
                            {/* Play Button Overlay */}
                            {result.spotifyTrack && (
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-full w-14 h-14 bg-purple-600/90 hover:bg-purple-600 text-white transition-all hover:scale-110"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayTrack(result.spotifyTrack!);
                                  }}
                                >
                                  <Play className="w-7 h-7" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* Content Section */}
                          <div className="p-4 space-y-3">
                            <div className="cursor-pointer" onClick={() => handleResultClick(result)}>
                              <h4 className="font-semibold text-base text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                                {result.spotifyTrack?.name || result.title}
                              </h4>
                              <p className="text-sm text-gray-300 line-clamp-1 mt-1">
                                {result.spotifyTrack?.artists?.map(a => a.name).join(", ") || result.artist}
                              </p>
                            </div>
                            
                            <div className="max-h-24 overflow-y-auto custom-scrollbar">
                              <p className="text-sm text-gray-400 leading-relaxed">
                                {result.explanation}
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Badge className="text-xs bg-purple-600/20 text-purple-300 border-purple-600/30 font-medium">
                                {result.relevanceScore}% match
                              </Badge>
                              {result.genre && (
                                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-gray-700/20">
                                  {result.genre}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="mt-6">
            <AIRecommendations onClickTrack={handleTrackClick} />
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="mt-6">
            <SongSimilarityComparison />
          </TabsContent>
        </Tabs>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-7xl mx-auto">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-white">Natural Language</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Search for music using everyday language. Describe moods, activities, or vibes.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-white">Smart Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Get personalized suggestions based on your listening history and preferences.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-white">Song Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Compare songs to understand their similarities in style, era, and themes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}