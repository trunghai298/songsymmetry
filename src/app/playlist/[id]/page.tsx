"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Container from "../../components/core/Container";
import { 
  AppButton, 
  BackButton, 
  ExternalLinkButton,
  PlayButton,
  Text,
  Heading,
  Display,
  Caption,
  AppCard,
  CardContent,
  StatCard,
  TrackCard,
  Stack,
  Grid,
  Section,
  Flex,
  MusicIcon,
  PlayIcon,
  UserIcon,
  ArrowLeftIcon,
  ExternalLinkIcon
} from "@/components/design-system";
import { Badge } from "@/components/ui/badge";
import { useAuthModal } from "@/hooks/useAuthModal";
import { useSpotifyContext } from "@/lib/spotify-sdk/SpotifyContext";
import LoginModal from "../../components/core/LoginModal";
import { 
  Music, 
  ArrowLeft,
  Play,
  ExternalLink,
  Calendar,
  Clock,
  User,
  BarChart3,
  TrendingUp,
  Zap,
  Heart,
  Headphones,
  Award,
  Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePlayer } from "@/hooks/usePlayer";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setTrack } from "@/lib/redux/slices/playerSlices";

interface PlaylistTrack {
  track: {
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      id: string;
      name: string;
      images: Array<{ url: string; height?: number; width?: number }>;
      release_date: string;
    };
    duration_ms: number;
    popularity: number;
    preview_url: string | null;
    uri: string;
    audio_features?: {
      danceability: number;
      energy: number;
      speechiness: number;
      acousticness: number;
      instrumentalness: number;
      liveness: number;
      valence: number;
      tempo: number;
    };
  };
  added_at: string;
}

interface PlaylistData {
  id: string;
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
  followers: { total: number };
  images: Array<{ url: string; height?: number; width?: number }>;
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
    items: PlaylistTrack[];
  };
  external_urls: {
    spotify: string;
  };
}

interface PlaylistStats {
  totalTracks: number;
  totalDuration: number;
  averagePopularity: number;
  releaseDecades: { [key: string]: number };
  topDecade: string;
  audioFeatures: {
    danceability: number;
    energy: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    valence: number;
    tempo: number;
  };
  topArtists: Array<{ name: string; count: number }>;
  energyLevel: string;
  diversityScore: number;
}

function PlaylistPage() {
  const { data: session } = useSession();
  const { client } = useSpotifyContext();
  const router = useRouter();
  const params = useParams();
  const playlistId = params.id as string;
  
  const { requireAuth, authModalProps } = useAuthModal({
    feature: "view playlist details",
    message: "Sign in with Spotify to view playlist information"
  });

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [playlistStats, setPlaylistStats] = useState<PlaylistStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWrappedPlaylist, setIsWrappedPlaylist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const { startPlayback } = usePlayer();

  // Check if playlist is a wrapped playlist
  const checkIfWrappedPlaylist = (playlistName: string): boolean => {
    const wrappedPatterns = [
      /your top songs 20\d{2}/i,
      /top songs 20\d{2}/i,
      /wrapped 20\d{2}/i,
      /spotify wrapped 20\d{2}/i,
      /your 20\d{2} wrapped/i,
      /my top songs 20\d{2}/i
    ];
    
    return wrappedPatterns.some(pattern => pattern.test(playlistName));
  };

  // Calculate playlist statistics
  const calculatePlaylistStats = (playlistData: PlaylistData): PlaylistStats => {
    const tracks = playlistData.tracks.items;
    
    // Basic stats
    const totalTracks = tracks.length;
    const totalDuration = tracks.reduce((sum, item) => sum + (item.track?.duration_ms || 0), 0);
    const averagePopularity = totalTracks > 0 ? Math.round(
      tracks.reduce((sum, item) => sum + (item.track?.popularity || 0), 0) / totalTracks
    ) : 0;

    // Release decades
    const releaseDecades: { [key: string]: number } = {};
    tracks.forEach(item => {
      if (item.track?.album?.release_date) {
        const year = new Date(item.track.album.release_date).getFullYear();
        const decade = Math.floor(year / 10) * 10;
        const decadeString = `${decade}s`;
        releaseDecades[decadeString] = (releaseDecades[decadeString] || 0) + 1;
      }
    });

    const topDecade = Object.entries(releaseDecades)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '2020s';

    // Audio features (if available)
    const audioFeatures = {
      danceability: 0,
      energy: 0,
      speechiness: 0,
      acousticness: 0,
      instrumentalness: 0,
      valence: 0,
      tempo: 0,
    };

    const tracksWithFeatures = tracks.filter(item => item.track?.audio_features);
    if (tracksWithFeatures.length > 0) {
      (Object.keys(audioFeatures) as Array<keyof typeof audioFeatures>).forEach(feature => {
        const sum = tracksWithFeatures.reduce((sum, item) => 
          sum + (item.track?.audio_features?.[feature] || 0), 0
        );
        audioFeatures[feature] = 
          feature === 'tempo' ? Math.round(sum / tracksWithFeatures.length) :
          Math.round((sum / tracksWithFeatures.length) * 100);
      });
    }

    // Top artists
    const artistCounts: { [key: string]: number } = {};
    tracks.forEach(item => {
      if (item.track?.artists) {
        item.track.artists.forEach(artist => {
          artistCounts[artist.name] = (artistCounts[artist.name] || 0) + 1;
        });
      }
    });

    const topArtists = Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Energy level
    const energyLevel = audioFeatures.energy > 70 ? 'High Energy' :
                       audioFeatures.energy > 40 ? 'Medium Energy' : 'Chill';

    // Diversity score (based on number of unique artists vs total tracks)
    const uniqueArtists = Object.keys(artistCounts).length;
    const diversityScore = Math.round((uniqueArtists / totalTracks) * 100);

    return {
      totalTracks,
      totalDuration,
      averagePopularity,
      releaseDecades,
      topDecade,
      audioFeatures,
      topArtists,
      energyLevel,
      diversityScore,
    };
  };

  useEffect(() => {
    const fetchPlaylistData = async () => {
      if (!client || !playlistId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch playlist details
        const playlistData = await client.getPlaylist(playlistId);
        
        // Fetch all tracks
        const allTracks: PlaylistTrack[] = [];
        let offset = 0;
        const limit = 50;
        let hasMore = true;

        while (hasMore) {
          const tracksResponse = await client.getPlaylistTracks(playlistId, limit, offset);
          allTracks.push(...tracksResponse.items);
          
          offset += limit;
          hasMore = tracksResponse.items.length === limit;
        }

        const completePlaylistData: PlaylistData = {
          ...playlistData,
          tracks: {
            total: allTracks.length,
            items: allTracks
          }
        };

        setPlaylist(completePlaylistData);
        
        // Check if it's a wrapped playlist
        const isWrapped = checkIfWrappedPlaylist(completePlaylistData.name);
        setIsWrappedPlaylist(isWrapped);
        
        // Calculate stats for wrapped playlists
        if (isWrapped) {
          const stats = calculatePlaylistStats(completePlaylistData);
          setPlaylistStats(stats);
        }

      } catch (error: any) {
        console.error('Error fetching playlist:', error);
        setError(error.message || 'Failed to fetch playlist');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylistData();
  }, [client, playlistId]);

  const playPlaylist = async () => {
    if (!requireAuth() || !playlist) {
      return;
    }

    try {
      const trackUris = playlist.tracks.items
        .filter(item => item.track && item.track.uri)
        .map(item => item.track.uri);

      if (trackUris.length === 0) {
        toast({
          title: "No Playable Tracks",
          description: "This playlist contains no playable tracks",
          variant: "destructive",
        });
        return;
      }

      const firstTrack = playlist.tracks.items.find(item => item.track)?.track;
      if (firstTrack) {
        dispatch(setTrack(firstTrack as any));
      }
      
      await startPlayback(trackUris);
      
      toast({
        title: `Playing ${playlist.name}`,
        description: `Started playlist with ${trackUris.length} tracks`,
      });
    } catch (error: any) {
      console.error('Error playing playlist:', error);
      
      let errorMessage = "Could not play playlist. Make sure Spotify is open.";
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

  const playTrack = async (track: any) => {
    if (!requireAuth()) {
      return;
    }

    try {
      dispatch(setTrack(track as any));
      await startPlayback([track.uri]);
      
      toast({
        title: "Now Playing",
        description: `${track.name} by ${track.artists[0].name}`,
      });
    } catch (error: any) {
      console.error('Error playing track:', error);
      toast({
        title: "Playback Error",
        description: "Could not play track. Make sure Spotify is open.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatTrackDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getYearFromPlaylistName = (name: string): string | null => {
    const yearMatch = name.match(/20(\d{2})/);
    return yearMatch ? `20${yearMatch[1]}` : null;
  };

  // Check authentication
  if (!session) {
    return (
      <Container>
        <LoginModal {...authModalProps} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <Music className="w-16 h-16 text-spotify-green mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Playlist Details</h1>
            <p className="text-gray-300 mb-6">
              Sign in with Spotify to view playlist information
            </p>
            <AppButton 
              onClick={() => requireAuth()}
              variant="primary"
              size="lg"
              shape="pill"
              className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold"
            >
              Sign In
            </AppButton>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <Music className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Error</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <BackButton onClick={() => router.back()}>
              Go Back
            </BackButton>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <LoginModal {...authModalProps} />
      
      <div className="min-h-screen py-8">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton onClick={() => router.back()} size="sm">Back</BackButton>
        </div>

        {isLoading ? (
          <Stack spacing="xl">
            {/* Header Skeleton */}
            <Flex gap="xl" direction="row" className="flex-col md:flex-row">
              <div className="w-full md:w-80 aspect-square bg-gray-800 rounded-lg animate-pulse"></div>
              <Stack spacing="md" className="flex-1">
                <div className="h-8 bg-gray-800 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2 animate-pulse"></div>
                <div className="h-4 bg-gray-800 rounded w-2/3 animate-pulse"></div>
              </Stack>
            </Flex>
            
            {/* Content Skeleton */}
            <Grid cols={3} responsive={{ sm: 1, md: 2, lg: 3 }} gap="lg">
              {[...Array(6)].map((_, i) => (
                <AppCard key={i} variant="muted" padding="lg" className="animate-pulse">
                  <CardContent>
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                  </CardContent>
                </AppCard>
              ))}
            </Grid>
          </Stack>
        ) : playlist ? (
          <Stack spacing="xl">
            {/* Playlist Header */}
            <Section variant={isWrappedPlaylist ? 'accent' : 'muted'} padding="lg">
              <Flex gap="xl" direction="row" className="flex-col md:flex-row">
                <div className="w-full md:w-80 aspect-square rounded-lg overflow-hidden">
                  <img
                    src={playlist.images[0]?.url || '/placeholder-playlist.png'}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <Stack spacing="md" className="flex-1">
                {isWrappedPlaylist && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-600 text-white border-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Wrapped Playlist
                    </Badge>
                    {getYearFromPlaylistName(playlist.name) && (
                      <Badge variant="outline" className="border-purple-400 text-purple-200">
                        {getYearFromPlaylistName(playlist.name)}
                      </Badge>
                    )}
                  </div>
                )}
                
                <Display size="medium">{playlist.name}</Display>
                
                {playlist.description && (
                  <Text color="secondary">{playlist.description}</Text>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {playlist.owner.display_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Music className="w-4 h-4" />
                    {playlist.tracks.total} tracks
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(playlistStats?.totalDuration || 0)}
                  </span>
                  {playlist.followers && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {playlist.followers.total.toLocaleString()} followers
                    </span>
                  )}
                </div>
                
                <Flex gap="md" className="pt-4">
                  <PlayButton size="md" onClick={playPlaylist}>
                    Play
                  </PlayButton>
                  
                  <ExternalLinkButton 
                    href={playlist.external_urls.spotify}
                    size="md"
                    shape="pill"
                  >
                    Open in Spotify
                  </ExternalLinkButton>
                </Flex>
                </Stack>
              </Flex>
            </Section>

            {/* Wrapped Playlist Stats */}
            {isWrappedPlaylist && playlistStats && (
              <Stack spacing="lg">
                <Heading level={2} className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                  Wrapped Stats
                </Heading>
                
                {/* Overview Stats */}
                <Grid cols={4} responsive={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap="lg">
                  <StatCard
                    title="Total Tracks"
                    value={playlistStats.totalTracks}
                    icon={Music}
                    variant="spotify"
                  />
                  
                  <StatCard
                    title="Avg Popularity"
                    value={`${playlistStats.averagePopularity}%`}
                    icon={TrendingUp}
                    variant="accent"
                  />
                  
                  <StatCard
                    title="Top Decade"
                    value={playlistStats.topDecade}
                    icon={Calendar}
                    variant="gradient"
                  />
                  
                  <StatCard
                    title="Energy Level"
                    value={playlistStats.energyLevel}
                    icon={Zap}
                    variant="default"
                  />
                </Grid>

                {/* Detailed Stats */}
                <Grid cols={2} responsive={{ sm: 1, lg: 2 }} gap="xl">
                  {/* Audio Features */}
                  <AppCard variant="default" padding="lg">
                    <Stack spacing="lg">
                      <Heading level={3} className="flex items-center gap-2">
                        <Headphones className="w-5 h-5 text-purple-400" />
                        Audio DNA
                      </Heading>
                      
                      <div className="space-y-4">
                        {Object.entries(playlistStats.audioFeatures).map(([feature, value]) => (
                          feature !== 'tempo' && (
                            <div key={feature} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-200 font-medium capitalize">
                                  {feature === 'valence' ? 'Positivity' : feature}
                                </span>
                                <span className="text-purple-400 font-bold">{value}%</span>
                              </div>
                              <div className="w-full bg-gray-600 rounded-full h-3">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-purple-300 h-3 rounded-full transition-all duration-1000"
                                  style={{ width: `${value}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        ))}
                        
                        <div className="pt-4 border-t border-gray-600">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-200 font-medium">Average Tempo</span>
                            <span className="text-purple-400 font-bold">{playlistStats.audioFeatures.tempo} BPM</span>
                          </div>
                        </div>
                      </div>
                    </Stack>
                  </AppCard>

                  {/* Top Artists */}
                  <AppCard variant="default" padding="lg">
                    <Stack spacing="lg">
                      <Heading level={3} className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-400" />
                        Top Artists
                      </Heading>
                      
                      <div className="space-y-4">
                        {playlistStats.topArtists.map((artist, index) => (
                          <div key={artist.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-purple-400 font-bold text-lg">#{index + 1}</span>
                              <span className="text-white font-medium">{artist.name}</span>
                            </div>
                            <Badge variant="outline" className="border-purple-500 text-purple-300">
                              {artist.count} tracks
                            </Badge>
                          </div>
                        ))}
                        
                        <div className="pt-4 border-t border-gray-600">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Artist Diversity</span>
                            <span className="text-purple-400 font-bold">{playlistStats.diversityScore}%</span>
                          </div>
                        </div>
                      </div>
                    </Stack>
                  </AppCard>
                </Grid>
              </Stack>
            )}

            {/* Track List */}
            <Stack spacing="lg">
              <Heading level={2} className="flex items-center gap-2">
                <MusicIcon size="lg" />
                Tracks
              </Heading>
              
              <Stack spacing="xs">
                {playlist.tracks.items.filter(item => item.track).map((item, index) => (
                  <TrackCard
                    key={`${item.track.id}-${index}`}
                    image={item.track.album.images[0]?.url || '/placeholder-album.png'}
                    title={item.track.name}
                    artist={item.track.artists.map(a => a.name).join(', ')}
                    album={item.track.album.name}
                    duration={formatTrackDuration(item.track.duration_ms)}
                    popularity={item.track.popularity}
                    index={index + 1}
                    onPlay={() => playTrack(item.track)}
                  />
                ))}
              </Stack>
            </Stack>
          </Stack>
        ) : null}
      </div>
    </Container>
  );
}

export default PlaylistPage;