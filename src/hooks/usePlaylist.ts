"use client";

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { SimplifiedPlaylist } from '@spotify/web-api-ts-sdk';
import { 
  fetchPlaylistsWithTracks, 
  clearPlaylists
} from '@/lib/redux/slices/playlistSlices';
import { selectPlaylists } from '@/lib/redux/selectors';

export function usePlaylist() {
  const dispatch = useAppDispatch();
  const playlists = useAppSelector(selectPlaylists);
  const playlistStatus = useAppSelector(state => state.playlist.status);
  const playlistError = useAppSelector(state => state.playlist.error);
  
  const fetchPlaylists = useCallback((playlists: SimplifiedPlaylist[]) => {
    dispatch(fetchPlaylistsWithTracks(playlists));
  }, [dispatch]);
  
  const resetPlaylists = useCallback(() => {
    dispatch(clearPlaylists());
  }, [dispatch]);
  
  return {
    playlists,
    isLoading: playlistStatus === 'loading',
    isError: playlistStatus === 'failed',
    error: playlistError,
    fetchPlaylists,
    resetPlaylists
  };
}