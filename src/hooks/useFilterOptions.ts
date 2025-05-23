import { useState, useEffect } from 'react';

interface FilterOptions {
  years: string[];
  languages: string[];
  genres: string[];
}

export function useFilterOptions() {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    years: [],
    languages: [],
    genres: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/songs/filter-options');
        
        if (!response.ok) {
          throw new Error('Failed to fetch filter options');
        }
        
        const data = await response.json();
        setFilterOptions(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching filter options:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  return { filterOptions, loading, error };
}