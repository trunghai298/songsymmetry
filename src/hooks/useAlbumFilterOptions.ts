import { useState, useEffect } from 'react';
import { getAlbumFilterOptions } from '@/app/explore/actions';

interface AlbumFilterOptions {
  years: string[];
  genres: string[];
  languages: string[];
  artists: string[];
}

export function useAlbumFilterOptions() {
  const [filterOptions, setFilterOptions] = useState<AlbumFilterOptions>({
    years: [],
    genres: [],
    languages: [],
    artists: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError(null);
        const options = await getAlbumFilterOptions();
        setFilterOptions(options);
      } catch (err) {
        console.error('Error fetching album filter options:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch filter options');
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  return { filterOptions, loading, error };
}