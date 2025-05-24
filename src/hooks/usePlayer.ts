"use client";

import { useCallback, useEffect, useState } from 'react';
import { Album, Playlist, Track } from '@spotify/web-api-ts-sdk';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { 
  closePlayer,
  expandPlayer,
  setTrack, 
  setPlaylist as setPlaylistAction,
  setAlbum as setAlbumAction,
  setCurrentTrack as setCurrentTrackAction,
  playNext,
  setAutoPlay,
  playFromQueue
} from '@/lib/redux/slices/playerSlices';
import { 
  selectCurrentTrack, 
  selectPlayerStatus, 
  selectPlayerTrack,
  selectEmbedSrc,
  selectPlayerSize,
  selectPlayerQueue,
  selectCurrentIndex,
  selectAutoPlay,
  selectHasNext
} from '@/lib/redux/selectors';
import { useSpotify } from './useSpotify';

export function usePlayer() {
  const dispatch = useAppDispatch();
  
  // Memoized selectors
  const playerTrack = useAppSelector(selectPlayerTrack);
  const playerStatus = useAppSelector(selectPlayerStatus);
  const playerSize = useAppSelector(selectPlayerSize);
  const currentTrack = useAppSelector(selectCurrentTrack);
  const embedSrc = useAppSelector(selectEmbedSrc);
  const queue = useAppSelector(selectPlayerQueue);
  const currentIndex = useAppSelector(selectCurrentIndex);
  const autoPlay = useAppSelector(selectAutoPlay);
  const hasNext = useAppSelector(selectHasNext);
  
  // Track timing for auto-play
  const [trackStartTime, setTrackStartTime] = useState<number | null>(null);
  
  // Spotify API access
  const { client: spotify } = useSpotify();
  
  // Real Spotify playback state
  const [spotifyPlaybackState, setSpotifyPlaybackState] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  
  // Actions
  const playTrack = useCallback((track: Track | undefined) => {
    dispatch(setTrack(track));
  }, [dispatch]);
  
  const playPlaylist = useCallback((playlist: Playlist | undefined) => {
    dispatch(setPlaylistAction(playlist));
  }, [dispatch]);
  
  const playAlbum = useCallback((album: Album | undefined) => {
    dispatch(setAlbumAction(album));
  }, [dispatch]);
  
  const close = useCallback(() => {
    dispatch(closePlayer());
  }, [dispatch]);
  
  const toggleSize = useCallback(() => {
    dispatch(expandPlayer());
  }, [dispatch]);
  
  const updateCurrentTrack = useCallback((track: Track) => {
    dispatch(setCurrentTrackAction(track));
  }, [dispatch]);
  
  const skipToNext = useCallback(() => {
    if (hasNext) {
      dispatch(playNext());
    }
  }, [hasNext, dispatch]);
  
  const toggleAutoPlay = useCallback(() => {
    dispatch(setAutoPlay(!autoPlay));
  }, [autoPlay, dispatch]);
  
  const playQueueFromIndex = useCallback((tracks: Track[], index: number) => {
    dispatch(playFromQueue({ tracks, index }));
  }, [dispatch]);

  // Spotify Web API playback controls
  const startPlayback = useCallback(async (uris?: string[], deviceId?: string) => {
    try {
      if (!spotify) {
        console.error('Spotify client not available');
        throw new Error('Spotify client not available');
      }

      console.log('Starting playback with uris:', uris, 'deviceId:', deviceId);

      if (uris && uris.length > 0) {
        await spotify.startResumePlayback(deviceId || '', undefined, uris);
      } else {
        await spotify.startResumePlayback(deviceId || '');
      }
      
      console.log('Playback started successfully');
    } catch (error) {
      console.error('Error starting playback:', error);
      console.error('Error details:', error);
      throw error;
    }
  }, [spotify]);

  const pausePlayback = useCallback(async (deviceId?: string) => {
    try {
      if (!spotify) {
        console.error('Spotify client not available');
        throw new Error('Spotify client not available');
      }

      console.log('Pausing playback, deviceId:', deviceId);
      await spotify.pausePlayback(deviceId);
      console.log('Playback paused successfully');
    } catch (error) {
      console.error('Error pausing playback:', error);
      console.error('Error details:', error);
      throw error;
    }
  }, [spotify]);

  const skipToNextTrack = useCallback(async (deviceId?: string) => {
    try {
      if (!spotify) {
        console.error('Spotify client not available');
        throw new Error('Spotify client not available');
      }

      console.log('Skipping to next track, deviceId:', deviceId);
      await spotify.skipToNext(deviceId);
      console.log('Skipped to next track');
    } catch (error) {
      console.error('Error skipping to next track:', error);
      console.error('Error details:', error);
      throw error;
    }
  }, [spotify]);

  const skipToPreviousTrack = useCallback(async (deviceId?: string) => {
    try {
      if (!spotify) {
        console.error('Spotify client not available');
        throw new Error('Spotify client not available');
      }

      console.log('Skipping to previous track, deviceId:', deviceId);
      await spotify.skipToPrevious(deviceId);
      console.log('Skipped to previous track');
    } catch (error) {
      console.error('Error skipping to previous track:', error);
      console.error('Error details:', error);
      throw error;
    }
  }, [spotify]);

  const getCurrentPlaybackState = useCallback(async () => {
    try {
      if (!spotify) {
        console.error('Spotify client not available');
        return null;
      }

      const playbackState = await spotify.getPlaybackState();
      return playbackState;
    } catch (error) {
      console.error('Error getting playback state:', error);
      return null;
    }
  }, [spotify]);

  const addToQueue = useCallback(async (uri: string, deviceId?: string) => {
    try {
      if (!spotify) {
        console.error('Spotify client not available');
        return;
      }

      await spotify.addItemToPlaybackQueue(uri, deviceId);
      console.log('Added to queue:', uri);
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  }, [spotify]);

  // Poll Spotify playback state with better error handling
  useEffect(() => {
    if (!spotify) return;
    
    // Only poll if we're on the explore page or if there's an active track
    const shouldPoll = window.location.pathname === '/explore' || spotifyPlaybackState?.item;
    if (!shouldPoll) return;

    let pollCount = 0;
    const maxErrors = 3;
    let errorCount = 0;

    const pollPlaybackState = async () => {
      try {
        const state = await getCurrentPlaybackState();
        if (state) {
          setSpotifyPlaybackState(state);
          setIsPlaying(state.is_playing || false);
          setCurrentProgress(state.progress_ms || 0);
          
          // Update our Redux state with current track if it changed
          // Only update if it's a track (not an episode/podcast)
          if (state.item && state.item.id !== currentTrack?.id && state.item.type === 'track') {
            dispatch(setCurrentTrackAction(state.item as Track));
          }
          
          // Reset error count on successful call
          errorCount = 0;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error polling playback state (${errorCount}/${maxErrors}):`, error);
        
        // Stop polling after too many errors to prevent session spam
        if (errorCount >= maxErrors) {
          console.warn('Too many Spotify API errors, stopping playback polling');
          return;
        }
      }
    };

    // Poll less frequently to reduce API calls: every 3 seconds when playing, every 10 seconds when paused
    const interval = setInterval(pollPlaybackState, isPlaying ? 3000 : 10000);
    
    // Initial poll only if we haven't polled recently
    if (pollCount === 0) {
      pollPlaybackState();
      pollCount++;
    }

    return () => clearInterval(interval);
  }, [spotify, getCurrentPlaybackState, isPlaying, currentTrack, dispatch]);

  // Auto-play functionality using track duration
  useEffect(() => {
    if (!playerTrack || !autoPlay || !hasNext) return;

    // Record when track starts playing
    setTrackStartTime(Date.now());

    // Get track duration in milliseconds (Spotify API returns duration in ms)
    const trackDuration = playerTrack.duration_ms;
    
    if (!trackDuration) return;

    console.log(`Setting auto-play timer for ${trackDuration}ms for track: ${playerTrack.name}`);

    // Set timeout to play next track when current one ends
    // Add 2 second buffer to ensure track has finished
    const timeout = setTimeout(() => {
      console.log('Auto-playing next track...');
      dispatch(playNext());
    }, trackDuration + 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, [playerTrack, autoPlay, hasNext, dispatch]);
  
  return {
    // State
    track: playerTrack,
    isOpen: playerStatus.isOpen,
    size: playerSize,
    currentTrack,
    embedSrc,
    type: playerStatus.type,
    queue,
    currentIndex,
    autoPlay,
    hasNext,
    trackStartTime,
    
    // Real Spotify Playback State
    spotifyPlaybackState,
    isPlaying,
    currentProgress,
    
    // Actions
    playTrack,
    playPlaylist,
    playAlbum,
    close,
    toggleSize,
    updateCurrentTrack,
    skipToNext,
    toggleAutoPlay,
    playQueueFromIndex,
    
    // Spotify Web API Controls
    startPlayback,
    pausePlayback,
    skipToNextTrack,
    skipToPreviousTrack,
    getCurrentPlaybackState,
    addToQueue: addToQueue
  };
}