"use client";

import { ItemTypes, Market, MaxInt, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { LocalStorageCache } from "../cache/localStorageCache";

// Define the allowed time range values that Spotify API accepts
type TimeRangeType = "short_term" | "medium_term" | "long_term";

/**
 * A thin wrapper around the Spotify SDK client that adds caching functionality
 */
export class CachedSpotifyClient {
  private client: SpotifyApi;
  private cache: LocalStorageCache;

  constructor(client: SpotifyApi) {
    this.client = client;
    this.cache = new LocalStorageCache("spotify-cache", {
      expiry: 1000 * 60 * 60,
    }); // 1 hour default
  }

  /**
   * Create a cache key from method name and arguments
   */
  private createCacheKey(method: string, args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  /**
   * General method to handle cached API requests
   */
  private async cachedRequest<T>(
    method: string,
    apiCall: () => Promise<T>,
    args: any[] = [],
    cacheTime?: number
  ): Promise<T> {
    const cacheKey = this.createCacheKey(method, args);
    const cached = this.cache.get<T>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await apiCall();
    this.cache.set(cacheKey, result, { expiry: cacheTime });
    return result;
  }

  // Cached API methods

  /**
   * Get a user's top tracks with caching
   */
  async getUserTopTracks(
    timeRange: TimeRangeType = "short_term",
    limit: MaxInt<50> = 20 as MaxInt<50>
  ) {
    return this.cachedRequest(
      "getUserTopTracks",
      () => this.client.currentUser.topItems("tracks", timeRange, limit),
      [timeRange, limit],
      1000 * 60 * 60 // 1 hour cache
    );
  }

  /**
   * Get a user's top artists with caching
   */
  async getUserTopArtists(
    timeRange: TimeRangeType = "short_term",
    limit: MaxInt<50> = 20 as MaxInt<50>
  ) {
    return this.cachedRequest(
      "getUserTopArtists",
      () => this.client.currentUser.topItems("artists", timeRange, limit),
      [timeRange, limit],
      1000 * 60 * 60 * 24 // 24 hour cache (changes less frequently)
    );
  }

  /**
   * Get a user's playlists with caching
   */
  async getUserPlaylists(limit: MaxInt<50> = 20 as MaxInt<50>, offset = 0) {
    return this.cachedRequest(
      "getUserPlaylists",
      () => this.client.currentUser.playlists.playlists(limit, offset),
      [limit, offset],
      1000 * 60 * 30 // 30 minute cache
    );
  }

  /**
   * Get a playlist with caching
   */
  async getPlaylist(playlistId: string) {
    return this.cachedRequest(
      "getPlaylist",
      () => this.client.playlists.getPlaylist(playlistId),
      [playlistId],
      1000 * 60 * 10 // 10 minute cache
    );
  }

  /**
   * Get playlist tracks with caching
   */
  async getPlaylistTracks(
    playlistId: string,
    limit: MaxInt<50> = 50 as MaxInt<50>,
    offset = 0
  ) {
    return this.cachedRequest(
      "getPlaylistTracks",
      () =>
        this.client.playlists.getPlaylistItems(
          playlistId,
          undefined,
          undefined,
          limit,
          offset
        ),
      [playlistId, limit, offset],
      1000 * 60 * 10 // 10 minute cache
    );
  }

  /**
   * Get a track with caching
   */
  async getTrack(trackId: string) {
    return this.cachedRequest(
      "getTrack",
      () => this.client.tracks.get(trackId),
      [trackId],
      1000 * 60 * 60 * 24 // 24 hour cache (track metadata rarely changes)
    );
  }

  /**
   * Get tracks with caching
   */
  async getTracks(trackIds: string[]) {
    return this.cachedRequest(
      "getTracks",
      () => this.client.tracks.get(trackIds),
      [trackIds],
      1000 * 60 * 60 * 24 // 24 hour cache
    );
  }

  /**
   * Get artist with caching
   */
  async getArtist(artistId: string) {
    return this.cachedRequest(
      "getArtist",
      () => this.client.artists.get(artistId),
      [artistId],
      1000 * 60 * 60 * 24 // 24 hour cache
    );
  }

  /**
   * Get artist's top tracks with caching
   */
  async getArtistTopTracks(artistId: string, market: Market = "US") {
    return this.cachedRequest(
      "getArtistTopTracks",
      () => this.client.artists.topTracks(artistId, market),
      [artistId, market],
      1000 * 60 * 60 * 3 // 3 hour cache
    );
  }

  /**
   * Get artist's related artists with caching
   */
  async getRelatedArtists(artistId: string) {
    return this.cachedRequest(
      "getRelatedArtists",
      () => this.client.artists.relatedArtists(artistId),
      [artistId],
      1000 * 60 * 60 * 24 // 24 hour cache
    );
  }

  /**
   * Search with caching
   */
  async search(
    query: string,
    types: ItemTypes[],
    market?: Market,
    limit: MaxInt<50> = 20 as MaxInt<50>,
    offset = 0
  ) {
    return this.cachedRequest(
      "search",
      () => this.client.search(query, types, market, limit, offset),
      [query, types, market, limit, offset],
      1000 * 60 * 10 // 10 minute cache
    );
  }

  /**
   * Get recommendations with caching
   */
  async getRecommendations(params: any) {
    return this.cachedRequest(
      "getRecommendations",
      () => this.client.recommendations.get(params),
      [params],
      1000 * 60 * 30 // 30 minute cache
    );
  }

  /**
   * Get current user profile - no caching as it's user-specific and should be fresh
   */
  async getCurrentUserProfile() {
    return this.client.currentUser.profile();
  }

  /**
   * Get currently playing track - no caching as it's real-time
   */
  async getCurrentlyPlayingTrack() {
    return this.client.player.getCurrentlyPlayingTrack();
  }

  /**
   * Add item to playback queue - no caching as it's an action
   */
  async addItemToPlaybackQueue(uri: string, deviceId?: string) {
    return this.client.player.addItemToPlaybackQueue(uri, deviceId as any);
  }

  /**
   * Get current playback state - no caching as it's real-time
   */
  async getPlaybackState() {
    return this.client.player.getPlaybackState();
  }

  /**
   * Start or resume playback - no caching as it's an action
   */
  async startResumePlayback(device_id: string, context_uri?: string, uris?: string[], offset?: object, positionMs?: number) {
    return this.client.player.startResumePlayback(device_id, context_uri, uris, offset, positionMs);
  }

  /**
   * Pause playback - no caching as it's an action
   */
  async pausePlayback(deviceId?: string) {
    return this.client.player.pausePlayback(deviceId as any);
  }

  /**
   * Skip to next track - no caching as it's an action
   */
  async skipToNext(deviceId?: string) {
    return this.client.player.skipToNext(deviceId as any);
  }

  /**
   * Skip to previous track - no caching as it's an action
   */
  async skipToPrevious(deviceId?: string) {
    return this.client.player.skipToPrevious(deviceId as any);
  }

  /**
   * Get available devices - short cache as device list can change
   */
  async getAvailableDevices() {
    return this.cachedRequest(
      "getAvailableDevices",
      () => this.client.player.getAvailableDevices(),
      [],
      1000 * 30 // 30 second cache
    );
  }

  /**
   * Create a playlist - no caching as it's an action
   */
  async createPlaylist(userId: string, data: any) {
    return this.client.playlists.createPlaylist(userId, data);
  }

  /**
   * Add items to a playlist - no caching as it's an action
   */
  async addItemsToPlaylist(playlistId: string, uris: string[]) {
    return this.client.playlists.addItemsToPlaylist(playlistId, uris);
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}
