interface SpotifyTrackData {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    release_date: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  popularity: number;
  duration_ms: number;
  explicit: boolean;
  preview_url?: string;
  external_urls: {
    spotify: string;
  };
}

interface FullTrackData {
  songId: string;
  songName: string;
  artistName: string;
  albumName: string;
  releaseYear: number;
  popularity: number;
  durationMs: number;
  imageUrl: string;
  isExplicit: boolean;
  spotifyUrl: string;
  previewUrl?: string;
}

export class SpotifyTrackService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string = "";
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID!;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  }

  /**
   * Get client credentials access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.accessToken.length > 0 && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify access token: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Subtract 1 minute for safety

    return this.accessToken;
  }

  /**
   * Fetch full track data from Spotify API
   */
  async getTrackData(trackId: string): Promise<FullTrackData> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
      }

      const track: SpotifyTrackData = await response.json();

      // Extract genre from album or artist (requires additional API call for detailed info)
      // For now, we'll leave genre empty and can enhance later
      
      return {
        songId: track.id,
        songName: track.name,
        artistName: track.artists.map(a => a.name).join(', '),
        albumName: track.album.name,
        releaseYear: new Date(track.album.release_date).getFullYear(),
        popularity: track.popularity,
        durationMs: track.duration_ms,
        imageUrl: track.album.images[0]?.url || '',
        isExplicit: track.explicit,
        spotifyUrl: track.external_urls.spotify,
        previewUrl: track.preview_url || undefined
      };
    } catch (error) {
      console.error(`Error fetching track data for ${trackId}:`, error);
      throw error;
    }
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrackData[]> {
    try {
      const accessToken = await this.getAccessToken();
      
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Spotify search error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.tracks?.items || [];
    } catch (error) {
      console.error('Error searching tracks:', error);
      throw error;
    }
  }

  /**
   * Get artist details including genres
   */
  async getArtistData(artistId: string) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Spotify artist API error: ${response.status}`);
      }

      const artist = await response.json();
      return {
        id: artist.id,
        name: artist.name,
        genres: artist.genres || [],
        popularity: artist.popularity,
        followers: artist.followers?.total || 0,
        images: artist.images || []
      };
    } catch (error) {
      console.error(`Error fetching artist data for ${artistId}:`, error);
      throw error;
    }
  }

  /**
   * Get enhanced track data with artist genres
   */
  async getEnhancedTrackData(trackId: string): Promise<FullTrackData & { genres: string[] }> {
    const trackData = await this.getTrackData(trackId);
    
    try {
      // Get the first artist's data for genres
      const track: SpotifyTrackData = await (async () => {
        const accessToken = await this.getAccessToken();
        const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return response.json();
      })();

      if (track.artists && track.artists.length > 0) {
        // Extract artist ID from the first artist (would need full artist object with ID)
        // For now, return without genres - can enhance this later
        return {
          ...trackData,
          genres: [] // Placeholder - requires artist ID to fetch genres
        };
      }
    } catch (error) {
      console.error('Error getting enhanced track data:', error);
    }

    return {
      ...trackData,
      genres: []
    };
  }
}

// Export singleton instance
export const spotifyTrackService = new SpotifyTrackService();