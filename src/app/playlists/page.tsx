"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Container from "../components/core/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthModal } from "@/hooks/useAuthModal";
import LoginModal from "../components/core/LoginModal";
import { 
  Music, 
  ExternalLink,
  User,
  Lock,
  Globe,
  Clock,
  Play
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import sdk from "@/lib/spotify-sdk/ClientInstance";

interface PlaylistInfo {
  id: string;
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
  owner: {
    display_name: string;
    id: string;
  };
  tracks: {
    total: number;
  };
  images: Array<{ url: string; height?: number; width?: number }>;
  external_urls: {
    spotify: string;
  };
}

function PlaylistsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { requireAuth, authModalProps } = useAuthModal({
    feature: "view your playlists",
    message: "Sign in with Spotify to see all your playlists"
  });

  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'wrapped'>('all');

  useEffect(() => {
    const fetchAllPlaylists = async () => {
      if (!session) return;

      setIsLoading(true);
      try {
        console.log('Fetching all playlists...');
        const allPlaylists: PlaylistInfo[] = [];
        let offset = 0;
        const limit = 50;
        let hasMore = true;

        while (hasMore) {
          const response = await sdk.currentUser.playlists.playlists(limit, offset);
          
          console.log(`Fetched ${response.items.length} playlists, offset: ${offset}`);
          
          if (!response.items || response.items.length === 0) {
            hasMore = false;
            break;
          }

          // Add all playlists with detailed info
          const playlistsData = response.items.map((playlist: any) => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description || '',
            public: playlist.public,
            collaborative: playlist.collaborative,
            owner: playlist.owner,
            tracks: playlist.tracks,
            images: playlist.images || [],
            external_urls: playlist.external_urls
          }));

          allPlaylists.push(...playlistsData);
          
          offset += limit;
          hasMore = response.items.length === limit;
        }

        console.log(`Found ${allPlaylists.length} playlists total`);
        
        // Log some examples for debugging
        console.log('Sample playlists:', allPlaylists.slice(0, 5).map(p => ({
          name: p.name,
          public: p.public,
          isWrapped: p.name.toLowerCase().includes('your top songs') && /20\d{2}/.test(p.name)
        })));

        setPlaylists(allPlaylists);

      } catch (error: any) {
        console.error('Error fetching playlists:', error);
        toast({
          title: "Error",
          description: "Failed to fetch playlists",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPlaylists();
  }, [session]);

  // Check authentication
  if (!session) {
    return (
      <Container>
        <LoginModal {...authModalProps} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <Music className="w-16 h-16 text-spotify-green mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Your Playlists</h1>
            <p className="text-gray-300 mb-6">
              View all your Spotify playlists in one place
            </p>
            <Button 
              onClick={() => requireAuth()}
              className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold px-8 py-3 rounded-full"
            >
              View My Playlists
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  const filteredPlaylists = playlists.filter(playlist => {
    switch (filter) {
      case 'public':
        return playlist.public;
      case 'private':
        return !playlist.public;
      case 'wrapped':
        return playlist.name.toLowerCase().includes('your top songs') && /20\d{2}/.test(playlist.name);
      default:
        return true;
    }
  });

  return (
    <Container>
      <LoginModal {...authModalProps} />
      
      <div className="min-h-screen py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Your Playlists</h1>
          <p className="text-gray-300 mb-6">
            Browse all your Spotify playlists
          </p>
          
          {/* Filter Buttons */}
          <div className="flex justify-center gap-2 mb-6">
            {[
              { key: 'all', label: 'All', count: playlists.length },
              { key: 'public', label: 'Public', count: playlists.filter(p => p.public).length },
              { key: 'private', label: 'Private', count: playlists.filter(p => !p.public).length },
              { key: 'wrapped', label: 'Wrapped', count: playlists.filter(p => p.name.toLowerCase().includes('your top songs') && /20\d{2}/.test(p.name)).length }
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                onClick={() => setFilter(key as any)}
                variant={filter === key ? "default" : "outline"}
                className={filter === key 
                  ? "bg-spotify-green text-black hover:bg-spotify-green/90" 
                  : "border-gray-600 text-gray-300 hover:bg-gray-700"
                }
              >
                {label} ({count})
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-700 rounded-md mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <p className="text-gray-400">
                Showing {filteredPlaylists.length} of {playlists.length} playlists
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlaylists.map((playlist) => (
                <Card key={playlist.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
                  <CardContent className="p-4">
                    <div className="relative mb-4">
                      <img
                        src={playlist.images[0]?.url || '/placeholder-playlist.png'}
                        alt={playlist.name}
                        className="w-full aspect-square rounded-md object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        {playlist.public ? (
                          <Badge className="bg-green-600 text-white border-0 text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            Public
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-600 text-white border-0 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-white text-sm line-clamp-2 min-h-[2.5rem]">
                        {playlist.name}
                      </h3>
                      
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          {playlist.tracks.total} tracks
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {playlist.owner.display_name}
                        </span>
                      </div>
                      
                      {playlist.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {playlist.description}
                        </p>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => window.open(playlist.external_urls.spotify, '_blank')}
                          className="flex-1 bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold text-xs py-1 px-2 rounded-md"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </Button>
                        {playlist.name.toLowerCase().includes('your top songs') && /20\d{2}/.test(playlist.name) && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/playlist/${playlist.id}`)}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold text-xs py-1 px-2 rounded-md"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredPlaylists.length === 0 && (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No playlists found</h3>
                <p className="text-gray-500">
                  {filter === 'wrapped' 
                    ? "No Spotify Wrapped playlists found. They're usually named 'Your Top Songs 20XX'."
                    : `No ${filter === 'all' ? '' : filter + ' '}playlists found.`
                  }
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  );
}

export default PlaylistsPage;