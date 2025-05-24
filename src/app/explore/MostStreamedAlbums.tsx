"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAlbumFilterOptions } from "@/hooks/useAlbumFilterOptions";
import { useRouter } from "next/navigation";
import { Track, Album } from "@spotify/web-api-ts-sdk";
import { map, startCase } from "lodash";
import { Filter, FilterX, Play, Search, X, Pause, SkipForward, SkipBack, Clock, Music, List, Plus, Shuffle, ExternalLink, PlayCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MostStreamedAlbum {
  id: number;
  albName: string | null;
  artist: string | null;
  thumbnail: string | null;
  albType: string | null;
  streamCount: bigint | null;
  dailyStreamCount: bigint | null;
  genre: string | null;
  language: string | null;
  year: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AlbumFilters {
  limit: number;
  year: string;
  genre: string;
  language: string;
  artist: string;
}

function MostStreamedAlbums({
  albums,
  filters,
  setFilters,
  onApplyFilters,
  isLoading,
  filterOptions,
}: {
  albums: MostStreamedAlbum[];
  filters: AlbumFilters;
  setFilters: React.Dispatch<React.SetStateAction<AlbumFilters>>;
  onApplyFilters: () => void;
  isLoading: boolean;
  filterOptions: {
    years: string[];
    genres: string[];
    languages: string[];
    artists: string[];
  };
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { client: spotify } = useSpotify();
  const { 
    startPlayback,
    pausePlayback,
    addToQueue,
    spotifyPlaybackState,
    isPlaying
  } = usePlayer();

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  // Search for Spotify album
  const searchSpotifyAlbum = async (albumName: string, artistName: string) => {
    try {
      if (!spotify) return null;
      
      const query = `album:"${albumName}" artist:"${artistName}"`;
      const results = await spotify.search(query, ['album'], 'US', 1);
      
      if (results.albums && results.albums.items.length > 0) {
        return results.albums.items[0];
      }
      
      // Fallback: search with just album name
      const fallbackQuery = `"${albumName}"`;
      const fallbackResults = await spotify.search(fallbackQuery, ['album'], 'US', 5);
      
      if (!fallbackResults.albums) {
        return null;
      }
      
      // Find the best match by artist
      const bestMatch = fallbackResults.albums.items.find(album => 
        album.artists.some(artist => 
          artist.name.toLowerCase().includes(artistName.toLowerCase()) ||
          artistName.toLowerCase().includes(artist.name.toLowerCase())
        )
      );
      
      return bestMatch || fallbackResults.albums.items[0] || null;
    } catch (error) {
      console.error('Error searching Spotify album:', error);
      return null;
    }
  };

  // Play album
  const playAlbum = async (album: MostStreamedAlbum) => {
    try {
      if (!album.albName || !album.artist) {
        toast({
          title: "Invalid Album",
          description: "Album name or artist is missing",
          variant: "destructive",
        });
        return;
      }
      
      const spotifyAlbum = await searchSpotifyAlbum(album.albName, album.artist);
      
      if (!spotifyAlbum) {
        toast({
          title: "Album Not Found",
          description: "Could not find this album on Spotify",
          variant: "destructive",
        });
        return;
      }

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

      // Find the active device or use the first available one
      const activeDevice = devices.find(device => device.is_active) || devices[0];
      
      // Start playback with album context
      await startPlayback([], activeDevice.id || undefined, spotifyAlbum.uri);
      
      // Note: SimplifiedAlbum from search doesn't include tracks
      // Redux will be updated when actual track starts playing
      
      toast({
        title: "Now Playing Album",
        description: `${album.albName} by ${album.artist}`,
      });
    } catch (error) {
      console.error('Error playing album:', error);
      toast({
        title: "Playback Error",
        description: "Could not start album playback. Make sure Spotify is open and you have Premium.",
        variant: "destructive",
      });
    }
  };

  // Navigate to album page
  const goToAlbum = async (album: MostStreamedAlbum) => {
    try {
      if (!album.albName || !album.artist) {
        toast({
          title: "Invalid Album",
          description: "Album name or artist is missing",
          variant: "destructive",
        });
        return;
      }
      
      const spotifyAlbum = await searchSpotifyAlbum(album.albName, album.artist);
      
      if (spotifyAlbum) {
        // Navigate to album page with Spotify album ID
        router.push(`/album/${spotifyAlbum.id}`);
      } else {
        toast({
          title: "Album Not Found",
          description: "Could not find this album on Spotify",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error finding album:', error);
      toast({
        title: "Error",
        description: "Could not navigate to album page",
        variant: "destructive",
      });
    }
  };

  // Format stream count
  const formatStreamCount = (count: bigint | string) => {
    const num = typeof count === 'string' ? BigInt(count) : count;
    
    if (num >= BigInt(1000000000)) {
      return `${(Number(num) / 1000000000).toFixed(1)}B`;
    } else if (num >= BigInt(1000000)) {
      return `${(Number(num) / 1000000).toFixed(1)}M`;
    } else if (num >= BigInt(1000)) {
      return `${(Number(num) / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Clear specific filter
  const clearFilter = (filterKey: keyof AlbumFilters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: filterKey === 'limit' ? 50 : ""
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      limit: 50,
      year: "",
      genre: "",
      language: "",
      artist: "",
    });
    setSearchTerm("");
  };

  // Check if any filters are applied
  const hasActiveFilters = filters.year || filters.genre || filters.language || filters.artist || searchTerm;

  // Filter albums based on search term
  const filteredAlbums = albums.filter(album => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (album.albName && album.albName.toLowerCase().includes(search)) ||
      (album.artist && album.artist.toLowerCase().includes(search)) ||
      (album.genre && album.genre.toLowerCase().includes(search)) ||
      (album.year && album.year.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Most Streamed Albums</h2>
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
            placeholder="Search albums, artists, genres..."
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
              {/* Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Results Limit
                </label>
                <Select
                  value={filters.limit.toString()}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="25">25 albums</SelectItem>
                    <SelectItem value="50">50 albums</SelectItem>
                    <SelectItem value="100">100 albums</SelectItem>
                    <SelectItem value="200">200 albums</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year
                </label>
                <Select
                  value={filters.year || "all"}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, year: value === "all" ? "" : value }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all">All years</SelectItem>
                    {filterOptions.years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Genre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genre
                </label>
                <Select
                  value={filters.genre || "all-genres"}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, genre: value === "all-genres" ? "" : value }))}
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

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language
                </label>
                <Select
                  value={filters.language || "all-languages"}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, language: value === "all-languages" ? "" : value }))}
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
                {filters.year && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
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
                    Genre: {startCase(filters.genre)}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                
                {filters.language && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                    onClick={() => clearFilter('language')}
                  >
                    Language: {startCase(filters.language)}
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
          {filteredAlbums.length} albums found
          {hasActiveFilters && ` (filtered from ${albums.length})`}
        </p>
        
        {filteredAlbums.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              onClick={() => {
                // Add all albums to queue functionality could go here
                toast({
                  title: "Feature Coming Soon",
                  description: "Add all albums to queue functionality will be available soon",
                });
              }}
            >
              <Plus className="w-4 h-4" />
              Add All to Queue
            </Button>
          </div>
        )}
      </div>

      {/* Albums Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredAlbums.map((album, index) => (
            <Card 
              key={album.id} 
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-200 group"
            >
              <CardContent className="p-4">
                {/* Album Cover */}
                <div className="relative aspect-square mb-4 group">
                  <div className="w-full h-full bg-gray-700 rounded-lg overflow-hidden">
                    {album.thumbnail ? (
                      <img 
                        src={album.thumbnail} 
                        alt={album.albName || 'Album cover'}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    
                    {/* Fallback */}
                    <div 
                      className="w-full h-full flex items-center justify-center bg-gray-700"
                      style={{ display: album.thumbnail ? 'none' : 'flex' }}
                    >
                      <Music className="w-12 h-12 text-gray-500" />
                    </div>
                  </div>
                  
                  {/* Hover Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => playAlbum(album)}
                      className="bg-green-600 hover:bg-green-700 text-white p-2"
                    >
                      <PlayCircle className="w-5 h-5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => goToAlbum(album)}
                      className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 p-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Rank Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge 
                      variant="secondary" 
                      className="bg-black/70 text-white border-none text-xs font-bold"
                    >
                      #{index + 1}
                    </Badge>
                  </div>
                </div>

                {/* Album Info */}
                <div className="space-y-2">
                  <h3 
                    className="font-semibold text-white line-clamp-2 cursor-pointer hover:text-green-400 transition-colors"
                    onClick={() => goToAlbum(album)}
                  >
                    {album.albName || 'Unknown Album'}
                  </h3>
                  
                  <p className="text-gray-400 text-sm line-clamp-1">
                    {album.artist || 'Unknown Artist'}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{album.year || 'Unknown'}</span>
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                      {album.albType || 'Album'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-medium text-sm">
                      {album.streamCount ? formatStreamCount(album.streamCount) : '0'} streams
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {album.genre && (
                      <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                        {album.genre}
                      </Badge>
                    )}
                    {album.language && (
                      <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                        {album.language}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredAlbums.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No albums found</h3>
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
    </div>
  );
}

export default MostStreamedAlbums;