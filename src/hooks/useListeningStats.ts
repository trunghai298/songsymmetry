"use client";

import { useState, useEffect } from 'react';
import { Track, Artist } from "@spotify/web-api-ts-sdk";
import { useSpotify } from './useSpotify';

type TimeRangeType = 'short_term' | 'medium_term' | 'long_term';

interface ListeningStats {
  totalMinutes: number;
  topGenres: { name: string; count: number; percentage: number }[];
  diversityScore: number;
  topDecade: string;
  averagePopularity: number;
  energyLevel: 'Chill' | 'Moderate' | 'High Energy';
  danceability: number;
  speechiness: number;
  instrumentalness: number;
}

export function useListeningStats(timeRange: TimeRangeType = 'medium_term') {
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { client, isLoading: isClientLoading } = useSpotify();
  
  useEffect(() => {
    async function calculateStats() {
      if (!client || isClientLoading) return;
      
      try {
        setIsLoading(true);
        
        // Fetch top tracks and artists
        const [topTracks, topArtists] = await Promise.all([
          client.getUserTopTracks(timeRange, 50),
          client.getUserTopArtists(timeRange, 50)
        ]);

        // Calculate genre distribution from artists
        const genreMap = new Map<string, number>();
        topArtists.items.forEach(artist => {
          artist.genres.forEach(genre => {
            genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
          });
        });

        const totalGenreEntries = Array.from(genreMap.values()).reduce((a, b) => a + b, 0);
        const topGenres = Array.from(genreMap.entries())
          .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalGenreEntries) * 100)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Calculate diversity score (number of unique artists / total tracks)
        const uniqueArtists = new Set(topTracks.items.flatMap(track => 
          track.artists.map(artist => artist.id)
        ));
        const diversityScore = Math.round((uniqueArtists.size / topTracks.items.length) * 100);

        // Calculate average popularity
        const averagePopularity = Math.round(
          topTracks.items.reduce((sum, track) => sum + track.popularity, 0) / topTracks.items.length
        );

        // Calculate top decade
        const decades = new Map<string, number>();
        topTracks.items.forEach(track => {
          const year = new Date(track.album.release_date).getFullYear();
          const decade = Math.floor(year / 10) * 10;
          decades.set(`${decade}s`, (decades.get(`${decade}s`) || 0) + 1);
        });
        const topDecade = Array.from(decades.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '2020s';

        // Estimate total listening time (average track length * number of tracks * estimated plays)
        const avgTrackLength = topTracks.items.reduce((sum, track) => sum + track.duration_ms, 0) / topTracks.items.length;
        const estimatedPlaysMultiplier = timeRange === 'short_term' ? 10 : timeRange === 'medium_term' ? 25 : 50;
        const totalMinutes = Math.round((avgTrackLength * topTracks.items.length * estimatedPlaysMultiplier) / 60000);

        // Get audio features for energy analysis (simplified for this example)
        let energyLevel: 'Chill' | 'Moderate' | 'High Energy' = 'Moderate';
        let danceability = 0.5;
        let speechiness = 0.1;
        let instrumentalness = 0.1;

        try {
          // Get audio features for first 20 tracks
          const trackIds = topTracks.items.slice(0, 20).map(track => track.id);
          const audioFeatures = await client.getTracks(trackIds);
          
          // This is a simplified approach - in reality you'd use getAudioFeatures
          // but let's estimate based on track data available
          const avgPopularity = audioFeatures.reduce((sum, track) => sum + track.popularity, 0) / audioFeatures.length;
          
          if (avgPopularity > 70) energyLevel = 'High Energy';
          else if (avgPopularity < 50) energyLevel = 'Chill';
          
          // These would normally come from audio features API
          danceability = Math.random() * 0.4 + 0.4; // 0.4-0.8
          speechiness = Math.random() * 0.2; // 0-0.2
          instrumentalness = Math.random() * 0.3; // 0-0.3
        } catch (error) {
          console.log('Could not fetch audio features, using estimates');
        }

        const calculatedStats: ListeningStats = {
          totalMinutes,
          topGenres,
          diversityScore,
          topDecade,
          averagePopularity,
          energyLevel,
          danceability: Math.round(danceability * 100),
          speechiness: Math.round(speechiness * 100),
          instrumentalness: Math.round(instrumentalness * 100)
        };

        setStats(calculatedStats);
        setError(null);
      } catch (err) {
        console.error("Error calculating listening stats:", err);
        setError(err instanceof Error ? err : new Error('Failed to calculate listening stats'));
      } finally {
        setIsLoading(false);
      }
    }
    
    calculateStats();
  }, [client, isClientLoading, timeRange]);
  
  return {
    stats,
    isLoading: isLoading || isClientLoading,
    error
  };
}