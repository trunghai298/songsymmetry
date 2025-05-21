import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';

// Player selectors
export const selectPlayerState = (state: RootState) => state.player;

export const selectPlayerTrack = createSelector(
  [selectPlayerState],
  (playerState) => playerState.track
);

export const selectPlayerStatus = createSelector(
  [selectPlayerState],
  (playerState) => ({
    isOpen: playerState.state === 'open',
    size: playerState.size,
    type: playerState.type
  })
);

export const selectPlayerSize = createSelector(
  [selectPlayerState],
  (playerState) => playerState.size
);

export const selectCurrentTrack = createSelector(
  [selectPlayerState],
  (playerState) => playerState.currentTrack
);

export const selectEmbedSrc = createSelector(
  [selectPlayerState],
  (playerState) => playerState.src
);

// Playlist selectors
export const selectPlaylists = (state: RootState) => state.playlist.playlist;

// Subscribe selectors
export const selectSubscribeStatus = (state: RootState) => state.subscribe.openDialog;