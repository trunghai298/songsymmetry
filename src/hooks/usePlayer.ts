"use client";

import { useCallback } from 'react';
import { Album, Playlist, Track } from '@spotify/web-api-ts-sdk';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { 
  closePlayer,
  expandPlayer,
  setTrack, 
  setPlaylist as setPlaylistAction,
  setAlbum as setAlbumAction,
  setCurrentTrack as setCurrentTrackAction
} from '@/lib/redux/slices/playerSlices';
import { 
  selectCurrentTrack, 
  selectPlayerStatus, 
  selectPlayerTrack,
  selectEmbedSrc,
  selectPlayerSize
} from '@/lib/redux/selectors';

export function usePlayer() {
  const dispatch = useAppDispatch();
  
  // Memoized selectors
  const playerTrack = useAppSelector(selectPlayerTrack);
  const playerStatus = useAppSelector(selectPlayerStatus);
  const playerSize = useAppSelector(selectPlayerSize);
  const currentTrack = useAppSelector(selectCurrentTrack);
  const embedSrc = useAppSelector(selectEmbedSrc);
  
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
  
  return {
    // State
    track: playerTrack,
    isOpen: playerStatus.isOpen,
    size: playerSize,
    currentTrack,
    embedSrc,
    type: playerStatus.type,
    
    // Actions
    playTrack,
    playPlaylist,
    playAlbum,
    close,
    toggleSize,
    updateCurrentTrack
  };
}