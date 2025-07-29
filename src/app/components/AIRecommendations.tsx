import React, { useEffect, useState } from 'react';
import { useAISearch } from '@/hooks/useAISearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from './core/Loader';
import { Track } from '@spotify/web-api-ts-sdk';
import { usePlayer } from '@/hooks/usePlayer';
import { useToast } from '@/hooks/use-toast';
import { Play, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AISongResult {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  relevanceScore: number;
  explanation: string;
  spotifyTrack?: Track;
}

interface AIRecommendationsProps {
  onClickTrack?: (track: Track) => void;
}

export default function AIRecommendations({ onClickTrack }: AIRecommendationsProps) {
  const { getRecommendations, isLoading, error } = useAISearch();
  const [recommendations, setRecommendations] = useState<AISongResult[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('medium_term');
  const [resultsLimit, setResultsLimit] = useState<number>(8);
  const { startPlayback } = usePlayer();
  const { toast } = useToast();

  const loadRecommendations = async () => {
    const results = await getRecommendations(resultsLimit, timeRange);
    
    // Fetch Spotify data for each recommendation
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
    
    setRecommendations(resultsWithSpotify);
    setHasLoaded(true);
  };

  useEffect(() => {
    if (!hasLoaded) {
      loadRecommendations();
    }
  }, [hasLoaded]);
  
  useEffect(() => {
    if (hasLoaded) {
      loadRecommendations();
    }
  }, [timeRange, resultsLimit]);

  const handleSongClick = async (recommendation: AISongResult) => {
    if (!onClickTrack) return;
    
    if (recommendation.spotifyTrack) {
      onClickTrack(recommendation.spotifyTrack);
    } else {
      toast({
        title: "Song Not Found",
        description: `"${recommendation.title}" by ${recommendation.artist} is not available on Spotify.`,
        variant: "destructive",
      });
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

  return (
    <Card className="w-full max-w-7xl mx-auto bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex justify-between items-center relative z-10">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg">
                <i className="bi bi-stars text-white text-lg" />
              </div>
              AI Recommendations
            </CardTitle>
            <CardDescription className="text-gray-300">
              Personalized suggestions based on your listening history
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="short_term" className="text-gray-200 hover:bg-gray-700">
                  Last 4 weeks
                </SelectItem>
                <SelectItem value="medium_term" className="text-gray-200 hover:bg-gray-700">
                  Last 6 months
                </SelectItem>
                <SelectItem value="long_term" className="text-gray-200 hover:bg-gray-700">
                  All time
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={resultsLimit.toString()} onValueChange={(value) => setResultsLimit(parseInt(value))}>
              <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue placeholder="Results" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="8" className="text-gray-200 hover:bg-gray-700">
                  8 songs
                </SelectItem>
                <SelectItem value="15" className="text-gray-200 hover:bg-gray-700">
                  15 songs
                </SelectItem>
                <SelectItem value="20" className="text-gray-200 hover:bg-gray-700">
                  20 songs
                </SelectItem>
                <SelectItem value="30" className="text-gray-200 hover:bg-gray-700">
                  30 songs
                </SelectItem>
                <SelectItem value="50" className="text-gray-200 hover:bg-gray-700">
                  50 songs
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={loadRecommendations}
              disabled={isLoading}
              size="sm"
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white border-0"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="h-8 w-8" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20 inline-block">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 inline-block">
              <i className="bi bi-music-note-list text-4xl text-gray-500 mb-2 block" />
              <p className="text-sm text-gray-400">
                Listen to some songs on Spotify to get personalized recommendations!
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Try changing the time range above to see different recommendations.
              </p>
            </div>
          </div>
        ) : (
          <>
            {recommendations.length > 0 && (
              <div className="mb-4 text-sm text-gray-400 text-center">
                Showing {recommendations.length} personalized recommendations
              </div>
            )}
            <div className={`grid gap-4 ${
              resultsLimit <= 8 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 
              resultsLimit <= 20 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="group relative bg-gray-800/50 rounded-lg border border-gray-700 hover:border-green-500/50 hover:bg-gray-800/70 transition-all duration-300 hover:shadow-lg hover:shadow-green-900/20 overflow-hidden"
              >
                {/* Album Art Section */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-900">
                  {rec.spotifyTrack?.album?.images?.[0] ? (
                    <img
                      src={rec.spotifyTrack.album.images[0].url}
                      alt={rec.title}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => handleSongClick(rec)}
                    />
                  ) : (
                    <div 
                      className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center cursor-pointer"
                      onClick={() => handleSongClick(rec)}
                    >
                      <i className="bi bi-music-note-beamed text-white text-4xl" />
                    </div>
                  )}
                  
                  {/* Play Button Overlay */}
                  {rec.spotifyTrack && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full w-14 h-14 bg-green-600/90 hover:bg-green-600 text-white transition-all hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(rec.spotifyTrack!);
                        }}
                      >
                        <Play className="w-7 h-7" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="p-4 space-y-3">
                  <div className="cursor-pointer" onClick={() => handleSongClick(rec)}>
                    <h4 className="font-semibold text-base text-white group-hover:text-green-300 transition-colors line-clamp-2">
                      {rec.spotifyTrack?.name || rec.title}
                    </h4>
                    <p className="text-sm text-gray-300 line-clamp-1 mt-1">
                      {rec.spotifyTrack?.artists?.map(a => a.name).join(", ") || rec.artist}
                    </p>
                  </div>
                  
                  <div className="max-h-24 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {rec.explanation}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge className="text-xs bg-green-600/20 text-green-300 border-green-600/30 font-medium">
                      {rec.relevanceScore}% match
                    </Badge>
                    {rec.genre && (
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-gray-700/20">
                        {rec.genre}
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
  );
}