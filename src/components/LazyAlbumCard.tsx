import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSpotifyAlbumBatch } from '@/hooks/useSpotifyAlbum';
import { Play, ExternalLink, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface LazyAlbumCardProps {
  album: MostStreamedAlbum;
  onPlay?: (album: MostStreamedAlbum) => void;
  onViewDetails?: (album: MostStreamedAlbum) => void;
  className?: string;
}

export const LazyAlbumCard: React.FC<LazyAlbumCardProps> = ({
  album,
  onPlay,
  onViewDetails,
  className = ''
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const { searchAlbum, getSpotifyImageUrl, isLoading } = useSpotifyAlbumBatch();

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          // Start fetching Spotify data when the card becomes visible
          if (album.albName && album.artist) {
            searchAlbum(album.albName, album.artist);
          }
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the card is visible
        threshold: 0.1
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      const currentRef = cardRef.current;
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [album.albName, album.artist, searchAlbum, isVisible]);

  // Get the best image URL (Spotify CDN with chartmaster fallback)
  const imageUrl = getSpotifyImageUrl(
    album.albName || '',
    album.artist || '',
    album.thumbnail || undefined
  );

  const formatStreamCount = (count: bigint | null): string => {
    if (!count) return '0';
    const num = Number(count);
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card 
      ref={cardRef}
      className={`bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-200 hover:border-gray-600 group ${className}`}
    >
      <CardContent className="p-4">
        <div className="relative">
          {/* Album Cover with Loading State */}
          <div className="relative w-full aspect-square mb-4 bg-gray-700 rounded-lg overflow-hidden">
            {!isVisible ? (
              // Placeholder before intersection
              <div className="w-full h-full bg-gray-700 animate-pulse flex items-center justify-center">
                <Music className="w-8 h-8 text-gray-500" />
              </div>
            ) : (
              <>
                {/* Loading indicator */}
                {isLoading(album.albName || '', album.artist || '') && !imageLoaded && (
                  <div className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                
                {/* Album Image */}
                <img
                  src={imageUrl || '/placeholder-album.png'}
                  alt={`${album.albName} by ${album.artist}`}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(true);
                  }}
                  loading="lazy"
                />
                
                {/* Fallback for failed images */}
                {imageError && (
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <Music className="w-8 h-8 text-gray-500" />
                  </div>
                )}
              </>
            )}
            
            {/* Hover overlay with controls */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
              {onPlay && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(album);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white p-2"
                >
                  <Play className="w-5 h-5" />
                </Button>
              )}
              
              {onViewDetails && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(album);
                  }}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 p-2"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Album Info */}
          <div className="space-y-2">
            <h3 
              className="font-semibold text-white text-sm truncate cursor-pointer hover:text-green-400 transition-colors"
              onClick={() => onViewDetails?.(album)}
            >
              {album.albName || 'Unknown Album'}
            </h3>
            
            <p className="text-gray-400 text-xs truncate">
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
                {formatStreamCount(album.streamCount)} streams
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
        </div>
      </CardContent>
    </Card>
  );
};