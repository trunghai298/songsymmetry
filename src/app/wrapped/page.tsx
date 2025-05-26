"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Container from "../components/core/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTopTracks } from "@/hooks/useTopTracks";
import { useTopArtists } from "@/hooks/useTopArtists";
import { useListeningStats } from "@/hooks/useListeningStats";
import { useWrappedPlaylists } from "@/hooks/useWrappedPlaylists";
import { useAuthModal } from "@/hooks/useAuthModal";
import { useSpotifyContext } from "@/lib/spotify-sdk/SpotifyContext";
import { useRouter } from "next/navigation";
import LoginModal from "../components/core/LoginModal";
import { 
  Music, 
  User, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Headphones,
  Zap,
  Heart,
  BarChart3,
  Sparkles,
  Play,
  Award,
  Disc3,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePlayer } from "@/hooks/usePlayer";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setTrack } from "@/lib/redux/slices/playerSlices";

type TimeRangeType = 'short_term' | 'medium_term' | 'long_term' | 'time_machine';

const timeRangeLabels = {
  short_term: 'Last 4 Weeks',
  medium_term: 'Last 6 Months', 
  long_term: 'All Time',
  time_machine: 'Time Machine'
};

function Wrapped() {
  const { data: session } = useSession();
  const { client } = useSpotifyContext();
  const router = useRouter();
  const { requireAuth, authModalProps } = useAuthModal({
    feature: "view your Spotify Wrapped",
    message: "Sign in with Spotify to see your personalized listening statistics and top tracks"
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeType>('medium_term');
  const [showAllTracksDialog, setShowAllTracksDialog] = useState(false);
  const [showAllArtistsDialog, setShowAllArtistsDialog] = useState(false);
  
  const { topTracks, isLoading: tracksLoading } = useTopTracks(
    selectedTimeRange === 'time_machine' ? 'long_term' : selectedTimeRange, 
    50
  );
  const { topArtists, isLoading: artistsLoading } = useTopArtists(
    selectedTimeRange === 'time_machine' ? 'long_term' : selectedTimeRange, 
    50
  );
  const { stats, isLoading: statsLoading } = useListeningStats(
    selectedTimeRange === 'time_machine' ? 'long_term' : selectedTimeRange
  );
  const { wrappedPlaylists, isLoading: playlistsLoading } = useWrappedPlaylists();
  
  const dispatch = useAppDispatch();
  const { startPlayback } = usePlayer();

  // Check authentication
  if (!session) {
    return (
      <Container>
        <LoginModal {...authModalProps} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <Headphones className="w-16 h-16 text-spotify-green mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Your Spotify Wrapped</h1>
            <p className="text-gray-300 mb-6">
              Discover your top tracks, artists, and listening habits from your Spotify data
            </p>
            <Button 
              onClick={() => requireAuth()}
              className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold px-8 py-3 rounded-full"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              View My Wrapped
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  const isLoading = tracksLoading || artistsLoading || statsLoading;

  // Debug logging
  console.log('Wrapped playlists:', wrappedPlaylists);
  console.log('Playlists loading:', playlistsLoading);

  const playTrack = async (track: any) => {
    if (!requireAuth()) {
      return;
    }

    try {
      dispatch(setTrack(track));
      await startPlayback([track.uri]);
      
      toast({
        title: "Now Playing",
        description: `${track.name} by ${track.artists[0].name}`,
      });
    } catch (error: any) {
      console.error('Error playing track:', error);
      
      let errorMessage = "Could not play track. Make sure Spotify is open.";
      if (error?.message?.includes("No active device")) {
        errorMessage = "No active Spotify device found. Please open Spotify on a device.";
      } else if (error?.message?.includes("Premium account")) {
        errorMessage = "Spotify Premium is required for playback control.";
      } else if (error?.message?.includes("Rate limit")) {
        errorMessage = "Too many requests - please wait a moment.";
      }
      
      toast({
        title: "Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const playAllTracks = async () => {
    if (!requireAuth()) {
      return;
    }

    if (!topTracks?.items || topTracks.items.length === 0) {
      toast({
        title: "No Tracks",
        description: "No top tracks available to play",
        variant: "destructive",
      });
      return;
    }

    try {
      const trackUris = topTracks.items.slice(0, 10).map(track => track.uri);
      dispatch(setTrack(topTracks.items[0]));
      await startPlayback(trackUris);
      
      toast({
        title: "Playing Your Top Songs",
        description: `Started playlist with ${trackUris.length} tracks`,
      });
    } catch (error: any) {
      console.error('Error playing tracks:', error);
      
      let errorMessage = "Could not start playlist. Make sure Spotify is open.";
      if (error?.message?.includes("No active device")) {
        errorMessage = "No active Spotify device found. Please open Spotify on a device.";
      } else if (error?.message?.includes("Premium account")) {
        errorMessage = "Spotify Premium is required for playback control.";
      }
      
      toast({
        title: "Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const playWrappedPlaylist = async (playlist: any) => {
    if (!requireAuth()) {
      return;
    }

    try {
      // Get playlist tracks first
      const playlistTracks = await client?.getPlaylistTracks(playlist.id, 50);
      
      if (!playlistTracks?.items || playlistTracks.items.length === 0) {
        toast({
          title: "No Tracks",
          description: "This playlist appears to be empty",
          variant: "destructive",
        });
        return;
      }

      // Extract track URIs (filter out null/undefined tracks)
      const trackUris = playlistTracks.items
        .filter((item: any) => item.track && item.track.uri)
        .map((item: any) => item.track.uri);

      if (trackUris.length === 0) {
        toast({
          title: "No Playable Tracks",
          description: "This playlist contains no playable tracks",
          variant: "destructive",
        });
        return;
      }

      // Set first track in player and start playback
      const firstTrack = playlistTracks.items.find((item: any) => item.track)?.track;
      if (firstTrack) {
        dispatch(setTrack(firstTrack));
      }
      
      await startPlayback(trackUris);
      
      toast({
        title: `Playing ${playlist.name}`,
        description: `Started your ${playlist.year} wrapped playlist with ${trackUris.length} tracks`,
      });
    } catch (error: any) {
      console.error('Error playing wrapped playlist:', error);
      
      let errorMessage = "Could not play playlist. Make sure Spotify is open.";
      if (error?.message?.includes("No active device")) {
        errorMessage = "No active Spotify device found. Please open Spotify on a device.";
      } else if (error?.message?.includes("Premium account")) {
        errorMessage = "Spotify Premium is required for playback control.";
      } else if (error?.message?.includes("Rate limit")) {
        errorMessage = "Too many requests - please wait a moment.";
      }
      
      toast({
        title: "Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Container>
      <LoginModal {...authModalProps} />
      
      <div className="min-h-screen py-4 sm:py-8 px-4 sm:px-0">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="relative inline-block">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-spotify-green via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 leading-tight">
              Your 2024 Wrapped
            </h1>
            <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-pulse" />
            </div>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto px-4">
            Your year in music, powered by your Spotify listening data
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-center mb-6 sm:mb-8 px-4">
          <Tabs value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as TimeRangeType)}>
            <TabsList className="bg-gray-800 border-gray-600 grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl h-auto p-1">
              {Object.entries(timeRangeLabels).map(([key, label]) => (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className={`data-[state=active]:font-semibold text-gray-300 hover:text-white transition-colors text-xs sm:text-sm py-2 px-1 sm:px-3 ${
                    key === 'time_machine' 
                      ? 'data-[state=active]:bg-purple-600 data-[state=active]:text-white' 
                      : 'data-[state=active]:bg-spotify-green data-[state=active]:text-black'
                  }`}
                >
                  {key === 'time_machine' && <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />}
                  <span className="truncate">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {selectedTimeRange === 'time_machine' ? (
          /* Time Machine Content */
          <div className="space-y-8">
            {playlistsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gray-700 rounded-md mb-3"></div>
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : wrappedPlaylists.length > 0 ? (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                    Your Musical Time Machine
                  </h2>
                  <p className="text-purple-200 mb-8">
                    Your official Spotify Wrapped playlists from past years
                  </p>
                  <Badge variant="secondary" className="bg-purple-700 text-purple-100 border-0 mb-8">
                    {wrappedPlaylists.length} years found
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {wrappedPlaylists.map((playlist) => (
                    <Card
                      key={playlist.id}
                      className="bg-gradient-to-br from-purple-800/80 via-purple-700/60 to-indigo-800/80 backdrop-blur-sm border-purple-500/40 hover:border-purple-400/60 transition-all duration-200 hover:bg-purple-700/70 shadow-lg cursor-pointer"
                      onClick={() => router.push(`/playlist/${playlist.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="relative mb-3">
                          <img
                            src={playlist.images[0]?.url || '/placeholder-playlist.png'}
                            alt={playlist.name}
                            className="w-full aspect-square rounded-md object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-purple-600 text-white border-0 text-xs font-semibold">
                              {playlist.year}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="font-semibold text-white text-sm truncate">
                            {playlist.name}
                          </h3>
                          
                          <div className="flex items-center justify-between text-xs text-purple-100">
                            <span className="flex items-center gap-1">
                              <Music className="w-3 h-3" />
                              {playlist.tracks.total} tracks
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock3 className="w-3 h-3" />
                              {playlist.year}
                            </span>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                playWrappedPlaylist(playlist);
                              }}
                              className="flex-1 bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold text-xs py-1 px-2 rounded-md"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Play
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(playlist.external_urls.spotify, '_blank');
                              }}
                              className="bg-purple-600/80 border-purple-400 text-white hover:bg-purple-500 hover:border-purple-300 text-xs py-1 px-2 rounded-md"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Pro Tips - Always Show */}
                <div className="bg-indigo-900/40 rounded-xl p-6 border border-indigo-600/30">
                  <h4 className="text-lg font-bold text-indigo-200 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    How to Access More Wrapped Playlists
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="space-y-2">
                      <h5 className="font-semibold text-indigo-100 flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        🔍 Search for Past Wrapped
                      </h5>
                      <p className="text-indigo-200">Search Spotify for &quot;Your Top Songs 2023&quot; or &quot;Spotify Wrapped 2022&quot; to find official playlists</p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-semibold text-indigo-100 flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        💾 Save to Your Library
                      </h5>
                      <p className="text-indigo-200">Follow or save Spotify&apos;s wrapped playlists to your library so they appear here</p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-semibold text-indigo-100 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        📅 Wait for December
                      </h5>
                      <p className="text-indigo-200">Spotify releases new Wrapped playlists every December - save them immediately!</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-indigo-600/30">
                    <div className="text-center">
                      <Button
                        onClick={() => window.open('https://open.spotify.com/search/your%20top%20songs', '_blank')}
                        variant="outline"
                        className="bg-transparent border-indigo-400 text-indigo-200 hover:bg-indigo-600/20 hover:text-white text-sm px-4 py-2"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Search for Wrapped Playlists
                      </Button>
                      <p className="text-xs text-indigo-300 mt-2">
                        Look for official Spotify-created &quot;Your Top Songs&quot; playlists and save them
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <History className="w-24 h-24 text-purple-400 mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-bold text-purple-400 mb-4">Find Your Time Machine</h3>
                <div className="max-w-4xl mx-auto text-purple-200 space-y-6">
                  <p className="text-lg">
                    Your Time Machine shows official Spotify Wrapped playlists that you&apos;ve saved to your library. 
                    Follow this guide to find and save your past wrapped playlists.
                  </p>
                  
                  <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/30 rounded-xl p-8 text-left">
                    <h4 className="text-xl font-bold text-purple-100 mb-6 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      How to Find Your Spotify Wrapped Playlists
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Search for Existing */}
                      <div className="space-y-4">
                        <div className="bg-spotify-green/20 rounded-lg p-4 border border-spotify-green/30">
                          <h5 className="font-bold text-spotify-green mb-3 flex items-center gap-2">
                            <Music className="w-4 h-4" />
                            Search for Official Playlists
                          </h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                              <Badge className="bg-spotify-green text-black border-0 text-xs mt-0.5">1</Badge>
                              <div>
                                <p className="font-medium text-white">Search in Spotify</p>
                                <p className="text-purple-300">Look for &quot;Your Top Songs 2024&quot;, &quot;Spotify Wrapped 2023&quot;, etc.</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Badge className="bg-spotify-green text-black border-0 text-xs mt-0.5">2</Badge>
                              <div>
                                <p className="font-medium text-white">Check Spotify&apos;s profile</p>
                                <p className="text-purple-300">Visit @spotify&apos;s profile for official wrapped playlists</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Badge className="bg-spotify-green text-black border-0 text-xs mt-0.5">3</Badge>
                              <div>
                                <p className="font-medium text-white">Save to your library</p>
                                <p className="text-purple-300">Follow or save the playlists so they appear here</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Check Email/History */}
                      <div className="space-y-4">
                        <div className="bg-purple-600/20 rounded-lg p-4 border border-purple-600/30">
                          <h5 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Check Your Wrapped History
                          </h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                              <Badge className="bg-purple-600 text-white border-0 text-xs mt-0.5">1</Badge>
                              <div>
                                <p className="font-medium text-white">Look for old emails</p>
                                <p className="text-purple-300">Spotify sends wrapped emails with playlist links</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Badge className="bg-purple-600 text-white border-0 text-xs mt-0.5">2</Badge>
                              <div>
                                <p className="font-medium text-white">Check your notifications</p>
                                <p className="text-purple-300">Past Spotify notifications may have playlist links</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Badge className="bg-purple-600 text-white border-0 text-xs mt-0.5">3</Badge>
                              <div>
                                <p className="font-medium text-white">Visit wrapped.spotify.com</p>
                                <p className="text-purple-300">Past wrapped experiences may have playlist links</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Important Notes */}
                    <div className="mt-8 bg-yellow-900/20 rounded-lg p-4 border border-yellow-600/30">
                      <h5 className="font-bold text-yellow-300 mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Important: Look for These Official Names
                      </h5>
                      <div className="text-sm space-y-2">
                        <p className="text-yellow-200">
                          Spotify creates wrapped playlists with these official naming patterns:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="bg-gray-800/50 rounded p-2">
                            <code className="text-spotify-green">✓ &quot;Your Top Songs 2024&quot;</code>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <code className="text-spotify-green">✓ &quot;Your Top Songs 2023&quot;</code>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <code className="text-spotify-green">✓ &quot;Top Songs 2022&quot;</code>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <code className="text-spotify-green">✓ &quot;Spotify Wrapped 2021&quot;</code>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Action */}
                    <div className="mt-6 text-center">
                      <Button
                        onClick={() => window.open('https://open.spotify.com/search/your%20top%20songs', '_blank')}
                        className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold px-6 py-3 rounded-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Search for Wrapped Playlists
                      </Button>
                      <p className="text-xs text-purple-400 mt-2">
                        Find and save Spotify&apos;s official wrapped playlists to see them here!
                      </p>
                    </div>
                  </div>
                  
                  {/* Pro Tips */}
                  <div className="bg-indigo-900/30 rounded-lg p-6 text-left">
                    <h4 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Pro Tips for Finding Wrapped Playlists
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-2">
                        <h5 className="font-semibold text-indigo-200">🔍 Search Smart</h5>
                        <p className="text-indigo-300">Try different search terms like &quot;wrapped&quot;, &quot;top songs&quot;, and specific years</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-semibold text-indigo-200">📧 Check Emails</h5>
                        <p className="text-indigo-300">Spotify emails often contain direct links to your wrapped playlists</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-semibold text-indigo-200">⏰ Save Immediately</h5>
                        <p className="text-indigo-300">When December Wrapped comes out, save the playlists right away!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                <Card className="bg-gradient-to-br from-spotify-green to-green-600 border-0 text-black shadow-lg">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <Clock className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-black" />
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-black">{stats.totalMinutes.toLocaleString()}</div>
                    <div className="text-xs sm:text-sm font-medium text-black/80">Minutes Listened</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-500 to-purple-700 border-0 text-white shadow-lg">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-white" />
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-white">{stats.diversityScore}%</div>
                    <div className="text-xs sm:text-sm font-medium text-white/90">Music Diversity</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-pink-500 to-pink-700 border-0 text-white shadow-lg">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <Calendar className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-white" />
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-white">{stats.topDecade}</div>
                    <div className="text-xs sm:text-sm font-medium text-white/90">Favorite Decade</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-500 to-blue-700 border-0 text-white shadow-lg">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <Zap className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-white" />
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-white">{stats.energyLevel}</div>
                    <div className="text-xs sm:text-sm font-medium text-white/90">Energy Level</div>
                  </CardContent>
                </Card>
              </div>
            )}


            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Top Tracks */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 sm:w-6 sm:h-6 text-spotify-green" />
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Your Top Songs</h2>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => playAllTracks()}
                      className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold px-3 sm:px-4 py-2 rounded-full text-sm w-fit"
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Play All
                    </Button>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3 transition-all duration-300">
                    {topTracks?.items.slice(0, 10).map((track, index) => (
                      <div 
                        key={track.id}
                        className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex-shrink-0 relative">
                          <img 
                            src={track.album.images[0]?.url || ''} 
                            alt={track.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-md"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start sm:items-center gap-2">
                            <span className="text-spotify-green font-bold text-sm sm:text-lg flex-shrink-0">#{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-white truncate text-sm sm:text-base">{track.name}</p>
                              <p className="text-gray-300 text-xs sm:text-sm truncate">
                                {track.artists.map(a => a.name).join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3">
                          <Badge variant="outline" className="text-xs border-gray-500 text-gray-300 hidden sm:inline-flex">
                            {Math.round(track.popularity)}%
                          </Badge>
                          
                          <Button
                            size="sm"
                            onClick={() => playTrack(track)}
                            className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold px-2 sm:px-3 py-1 rounded-full transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs sm:text-sm"
                          >
                            <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">Play</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Show All Button */}
                  {topTracks?.items && topTracks.items.length > 10 && (
                    <div className="mt-6 pt-4 border-t border-gray-700 text-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllTracksDialog(true)}
                        className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white hover:border-gray-500 transition-all duration-200 px-6 py-2"
                      >
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Show All {topTracks.items.length} Songs
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Artists */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-spotify-green" />
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Your Top Artists</h2>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    {topArtists?.items.slice(0, 8).map((artist, index) => (
                      <div key={artist.id} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-700 transition-colors">
                        <img 
                          src={artist.images[0]?.url || ''} 
                          alt={artist.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 sm:mb-2">
                            <span className="text-spotify-green font-bold text-sm sm:text-lg flex-shrink-0">#{index + 1}</span>
                            <p className="font-semibold text-white text-sm sm:text-base truncate">{artist.name}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {artist.genres.slice(0, 2).map((genre, i) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-gray-600 text-gray-100 border-0">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-right hidden sm:block">
                          <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                            {artist.popularity}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Show All Artists Button */}
                  {topArtists?.items && topArtists.items.length > 8 && (
                    <div className="mt-6 pt-4 border-t border-gray-700 text-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllArtistsDialog(true)}
                        className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white hover:border-gray-500 transition-all duration-200 px-6 py-2"
                      >
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Show All {topArtists.items.length} Artists
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Genre & Audio Features */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Top Genres */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-spotify-green" />
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Your Top Genres</h2>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                      {stats.topGenres.map((genre, index) => (
                        <div key={genre.name} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-100 font-medium capitalize text-sm sm:text-base truncate pr-2">{genre.name}</span>
                            <span className="text-spotify-green font-bold text-sm sm:text-base flex-shrink-0">{genre.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2 sm:h-3">
                            <div 
                              className="bg-gradient-to-r from-spotify-green to-green-400 h-2 sm:h-3 rounded-full transition-all duration-1000"
                              style={{ width: `${genre.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Audio Features */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <Disc3 className="w-5 h-5 sm:w-6 sm:h-6 text-spotify-green" />
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Your Music DNA</h2>
                    </div>
                    
                    <div className="space-y-4 sm:space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-100 font-medium text-sm sm:text-base">Danceability</span>
                          <span className="text-spotify-green font-bold text-sm sm:text-base">{stats.danceability}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-pink-500 to-pink-300 h-2 rounded-full"
                            style={{ width: `${stats.danceability}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-100 font-medium text-sm sm:text-base">Speechiness</span>
                          <span className="text-spotify-green font-bold text-sm sm:text-base">{stats.speechiness}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-300 h-2 rounded-full"
                            style={{ width: `${stats.speechiness}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-100 font-medium text-sm sm:text-base">Instrumentalness</span>
                          <span className="text-spotify-green font-bold text-sm sm:text-base">{stats.instrumentalness}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-purple-300 h-2 rounded-full"
                            style={{ width: `${stats.instrumentalness}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-100 font-medium">Average Popularity</span>
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-yellow-400" />
                            <span className="text-spotify-green font-bold">{stats.averagePopularity}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        
        {/* All Tracks Dialog */}
        <Dialog open={showAllTracksDialog} onOpenChange={setShowAllTracksDialog}>
          <DialogContent className="max-w-4xl max-h-[95vh] bg-gray-800 border-gray-700 mx-2 sm:mx-4 w-[calc(100vw-1rem)] sm:w-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-spotify-green" />
                <span className="truncate">Your Top {topTracks?.items?.length || 50} Songs - {timeRangeLabels[selectedTimeRange]}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto max-h-[70vh] pr-2">
              <div className="space-y-2 sm:space-y-3">
                {topTracks?.items.map((track, index) => (
                  <div 
                    key={track.id}
                    className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-gray-700 transition-colors group"
                  >
                    <div className="flex-shrink-0 relative">
                      <img 
                        src={track.album.images[0]?.url || ''} 
                        alt={track.name}
                        className="w-12 h-12 rounded-md"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-spotify-green font-bold text-lg flex-shrink-0">#{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white text-base leading-tight mb-1">{track.name}</p>
                          <p className="text-gray-300 text-sm leading-tight">
                            {track.artists.map(a => a.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 flex-shrink-0">
                      <Badge variant="outline" className="text-xs border-gray-500 text-gray-300 whitespace-nowrap">
                        {Math.round(track.popularity)}% popular
                      </Badge>
                      
                      <Button
                        size="sm"
                        onClick={() => playTrack(track)}
                        className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold px-3 sm:px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[80px] group-hover:scale-105 text-sm"
                      >
                        <Play className="w-4 h-4" />
                        <span className="hidden sm:inline">Play</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* All Artists Dialog */}
        <Dialog open={showAllArtistsDialog} onOpenChange={setShowAllArtistsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-spotify-green" />
                Your Top {topArtists?.items?.length || 50} Artists - {timeRangeLabels[selectedTimeRange]}
              </DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto max-h-[60vh] pr-4">
              <div className="space-y-4">
                {topArtists?.items.map((artist, index) => (
                  <div key={artist.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-700 transition-colors">
                    <img 
                      src={artist.images[0]?.url || ''} 
                      alt={artist.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-spotify-green font-bold text-lg">#{index + 1}</span>
                        <p className="font-semibold text-white">{artist.name}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {artist.genres.slice(0, 3).map((genre, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-gray-600 text-gray-100 border-0">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                        {artist.popularity}% popular
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  );
}

export default Wrapped;