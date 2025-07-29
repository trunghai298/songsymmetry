import { useState, useCallback } from 'react';

interface AISongResult {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  relevanceScore: number;
  explanation: string;
}

interface SimilarityResult {
  similarity: number;
  explanation: string;
}

export function useAISearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchSongs = useCallback(async (
    query: string,
    existingSongs?: Array<{ title: string; artist: string }>
  ): Promise<AISongResult[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, existingSongs }),
      });

      if (!response.ok) {
        throw new Error('Failed to search songs');
      }

      const data = await response.json();
      return data.results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeSimilarity = useCallback(async (
    song1: { title: string; artist: string },
    song2: { title: string; artist: string }
  ): Promise<SimilarityResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ song1, song2 }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze similarity');
      }

      const data = await response.json();
      return {
        similarity: data.similarity,
        explanation: data.explanation
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRecommendations = useCallback(async (
    limit: number = 10,
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
  ): Promise<AISongResult[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai/recommendations?limit=${limit}&timeRange=${timeRange}`);

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();
      return data.recommendations;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recommendations failed');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchSongs,
    analyzeSimilarity,
    getRecommendations,
    isLoading,
    error
  };
}