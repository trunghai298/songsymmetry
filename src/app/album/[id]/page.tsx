"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Container from "../../components/core/Container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setTrack } from "@/lib/redux/slices/playerSlices";
import { usePlayer } from "@/hooks/usePlayer";
import { useSpotify } from "@/hooks/useSpotify";
import { Album, Track, SimplifiedTrack } from "@spotify/web-api-ts-sdk";
import { 
  Play, 
  Pause, 
  Plus, 
  ExternalLink, 
  Clock, 
  Calendar,
  User,
  Music,
  ArrowLeft,
  Shuffle,
  Heart,
  MoreHorizontal,
  PlayCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Loader } from "../../components/core/Loader";
import { useAuthModal } from "@/hooks/useAuthModal";
import LoginModal from "../../components/core/LoginModal";

function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;
  
  const dispatch = useAppDispatch();
  const { client: spotify } = useSpotify();
  const { 
    startPlayback,
    pausePlayback,
    addToQueue,
    spotifyPlaybackState,
    isPlaying
  } = usePlayer();

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<SimplifiedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth modal for interactive features
  const { requireAuth, authModalProps } = useAuthModal({
    feature: "play tracks and access playback controls",
    message: "Sign in with Spotify to play tracks, add to queue, and access playback controls"
  });

  // Fetch album data
  useEffect(() => {
    const fetchAlbum = async () => {
      if (!spotify || !albumId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching album:', albumId);
        const albumData = await spotify.albums.get(albumId, 'US');
        setAlbum(albumData);
        setTracks(albumData.tracks.items);
        console.log('Album data:', albumData);
      } catch (error: any) {
        console.error('Error fetching album:', error);
        setError(error.message || 'Failed to load album');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [spotify, albumId]);

  // Get available devices
  const getAvailableDevices = async () => {
    try {
      if (!spotify) return [];
      const devices = await spotify.getAvailableDevices();
      return devices.devices || [];
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  };

  // Play entire album
  const playAlbum = async (trackIndex: number = 0) => {
    // Check authentication before allowing play
    if (!requireAuth()) {
      return;
    }

    try {
      if (!album) return;

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
      
      // Start playback with album context and specific track
      await startPlayback([], activeDevice.id || undefined, album.uri, { position: trackIndex });
      
      // Update Redux with the track
      if (tracks[trackIndex]) {
        const track = convertToFullTrack(tracks[trackIndex]);
        dispatch(setTrack(track));
      }
      
      toast({
        title: "Now Playing",
        description: `${album.name} by ${album.artists[0].name}`,
      });
    } catch (error: any) {
      console.error('Error playing album:', error);
      toast({
        title: "Playback Error",
        description: "Could not start playback. Make sure Spotify is open and you have Premium.",
        variant: "destructive",
      });
    }
  };

  // Play specific track
  const playTrack = async (track: SimplifiedTrack, index: number) => {
    // Check authentication before allowing play
    if (!requireAuth()) {
      return;
    }

    try {
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
      
      // Play single track with album context
      await startPlayback([track.uri], activeDevice.id || undefined);
      
      // Update Redux with the track
      const fullTrack = convertToFullTrack(track);
      dispatch(setTrack(fullTrack));
      
      toast({
        title: "Now Playing",
        description: `${track.name} by ${track.artists[0].name}`,
      });
    } catch (error: any) {
      console.error('Error playing track:', error);
      toast({
        title: "Playback Error",
        description: "Could not start track playback. Make sure Spotify is open and you have Premium.",
        variant: "destructive",
      });
    }
  };

  // Add track to queue
  const addTrackToQueue = async (track: SimplifiedTrack) => {
    // Check authentication before allowing add to queue
    if (!requireAuth()) {
      return;
    }

    try {
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
        description: `${track.name} by ${track.artists[0].name}`,
      });
    } catch (error: any) {
      console.error('Error adding to queue:', error);
      
      // Provide specific error messages
      let errorMessage = "Could not add track to queue";
      if (error?.message?.includes("No active device")) {
        errorMessage = "No active Spotify device found";
      } else if (error?.message?.includes("Premium account")) {
        errorMessage = "Spotify Premium is required for this feature";
      } else if (error?.message?.includes("Rate limit")) {
        errorMessage = "Too many requests - please wait a moment";
      }
      
      toast({
        title: "Queue Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Convert SimplifiedTrack to Track for Redux
  const convertToFullTrack = (track: SimplifiedTrack): Track => {
    return {
      ...track,
      album: {
        ...album!,
        album_group: 'album' as any, // Required field for SimplifiedAlbum
      },
      external_ids: {
        isrc: '',
        ean: '',
        upc: ''
      },
      popularity: 0,
      external_urls: track.external_urls || album!.external_urls
    } as unknown as Track;
  };

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format release date
  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Calculate total duration
  const getTotalDuration = () => {
    const totalMs = tracks.reduce((acc, track) => acc + track.duration_ms, 0);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Container>
          <div className="text-center">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Album Not Found</h1>
            <p className="text-gray-400 mb-6">{error || "The requested album could not be found."}</p>
            <Button 
              onClick={() => router.back()}
              variant="outline"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Login Modal */}
      <LoginModal {...authModalProps} />
      {/* Header with album cover and info */}
      <div 
        className="relative h-96 bg-gradient-to-b from-gray-800 to-gray-900"
        style={{
          backgroundImage: album.images[0]?.url ? `url(${album.images[0].url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex items-end">
          <Container>
            <div className="pb-8">
              {/* Back button */}
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="sm"
                className="mb-6 text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex items-end gap-6">
                {/* Album cover */}
                <div className="w-48 h-48 bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex-shrink-0">
                  {album.images[0]?.url ? (
                    <img 
                      src={album.images[0].url} 
                      alt={album.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Album info */}
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-2 bg-gray-800 text-gray-300">
                    {album.album_type.toUpperCase()}
                  </Badge>
                  
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 line-clamp-2">
                    {album.name}
                  </h1>
                  
                  <div className="flex items-center gap-2 text-gray-300 mb-4">
                    <User className="w-4 h-4" />
                    <span className="font-medium">
                      {album.artists.map(artist => artist.name).join(', ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatReleaseDate(album.release_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Music className="w-4 h-4" />
                      {tracks.length} tracks
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getTotalDuration()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </div>

      {/* Controls and track list */}
      <div className="bg-gray-900">
        <Container>
          <div className="py-8">
            {/* Playback controls */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                onClick={() => playAlbum()}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white rounded-full w-14 h-14 p-0"
              >
                <PlayCircle className="w-6 h-6" />
              </Button>
              
              <Button
                onClick={() => playAlbum(Math.floor(Math.random() * tracks.length))}
                variant="outline"
                size="lg"
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Shuffle Play
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <Heart className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <MoreHorizontal className="w-6 h-6" />
              </Button>
              
              <Button
                onClick={() => window.open(album.external_urls.spotify, '_blank')}
                variant="ghost"
                size="lg"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Spotify
              </Button>
            </div>

            {/* Track list */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-4 text-sm text-gray-400 border-b border-gray-700">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6">Title</div>
                  <div className="col-span-3">Artist</div>
                  <div className="col-span-1 text-center">
                    <Clock className="w-4 h-4 mx-auto" />
                  </div>
                  <div className="col-span-1"></div>
                </div>

                {/* Tracks */}
                <div className="divide-y divide-gray-700">
                  {tracks.map((track, index) => (
                    <div 
                      key={track.id}
                      className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-750 group transition-colors"
                    >
                      {/* Track number */}
                      <div className="col-span-1 text-center text-gray-400 group-hover:hidden">
                        {index + 1}
                      </div>
                      <div className="col-span-1 text-center hidden group-hover:block">
                        <Button
                          onClick={() => playTrack(track, index)}
                          variant="ghost"
                          size="sm"
                          className="w-6 h-6 p-0 text-white hover:bg-gray-600"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Track name */}
                      <div className="col-span-6">
                        <div 
                          className="font-medium text-white cursor-pointer hover:text-green-400 transition-colors line-clamp-1"
                          onClick={() => playTrack(track, index)}
                        >
                          {track.name}
                        </div>
                        {track.explicit && (
                          <Badge variant="secondary" className="mt-1 text-xs bg-gray-700 text-gray-400">
                            E
                          </Badge>
                        )}
                      </div>

                      {/* Artist */}
                      <div className="col-span-3 text-gray-400 line-clamp-1">
                        {track.artists.map(artist => artist.name).join(', ')}
                      </div>

                      {/* Duration */}
                      <div className="col-span-1 text-center text-gray-400 text-sm">
                        {formatDuration(track.duration_ms)}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => addTrackToQueue(track)}
                          variant="ghost"
                          size="sm"
                          className="w-6 h-6 p-0 text-gray-400 hover:text-white hover:bg-gray-600"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Album info */}
            {(album.copyrights?.length > 0 || album.label) && (
              <div className="mt-8 text-xs text-gray-500">
                {album.label && <p>© {album.label}</p>}
                {album.copyrights?.map((copyright, index) => (
                  <p key={index}>{copyright.text}</p>
                ))}
              </div>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}

export default AlbumPage;