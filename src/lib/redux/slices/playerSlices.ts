import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "../store";
import { Album, PlaybackState, Playlist, Track } from "@spotify/web-api-ts-sdk";

interface IPlayer {
  state: "open" | "closed";
  track: Track | undefined;
  type: "single" | "playlist" | "album";
  size: "compact" | "full";
  src: string;
  currentTrack: Track | undefined;
}

export const playerSlice = createSlice({
  name: "player",
  initialState: {
    state: "closed",
    track: undefined,
    type: "single",
    size: "compact",
  } as IPlayer,
  reducers: {
    setCurrentTrack: (
      state,
      action: PayloadAction<{ currentTrack: Track | undefined }>
    ) => {
      state.currentTrack = action.payload.currentTrack;
    },
    setTrack: (state, action: PayloadAction<{ track: Track | undefined }>) => {
      state.state = "open";
      state.track = action.payload.track;
      state.size = "compact";
      state.type = "single";
      state.src = `https://open.spotify.com/embed/track/${action.payload.track?.id}?utm_source=generator`;
    },
    setPlaylist: (
      state,
      action: PayloadAction<{ playlist: Playlist | undefined }>
    ) => {
      state.state = "open";
      state.track = undefined;
      state.size = "full";
      state.type = "playlist";
      state.src = `https://open.spotify.com/embed/playlist/${action.payload.playlist?.id}?utm_source=generator`;
    },
    setAlbum: (state, action: PayloadAction<{ album: Album | undefined }>) => {
      state.state = "open";
      state.track = undefined;
      state.size = "full";
      state.type = "playlist";
      state.src = `https://open.spotify.com/embed/album/${action.payload.album?.id}?utm_source=generator`;
    },
    closePlayer: (state) => {
      state.state = "closed";
    },
    expandPlayer: (state) => {
      if (state.size === "compact") {
        state.size = "full";
      } else {
        state.size = "compact";
      }
    },
  },
});

// Action creators are generated for each case reducer function
const {
  setTrack: setTrackAction,
  setPlaylist: setPlaylistAction,
  setAlbum: setAlbumAction,
  closePlayer: closePlayerAction,
  expandPlayer: expandPlayerAction,
  setCurrentTrack: setCurrentTrackAction,
} = playerSlice.actions;

export const setTrack =
  (track: Track | undefined) => async (dispatch: AppDispatch) => {
    dispatch(setTrackAction({ track }));
  };

export const setPlaylist =
  (playlist: Playlist | undefined) => async (dispatch: AppDispatch) => {
    dispatch(setPlaylistAction({ playlist }));
  };

export const setAlbum =
  (album: Album | undefined) => async (dispatch: AppDispatch) => {
    dispatch(setAlbumAction({ album }));
  };

export const closePlayer = () => async (dispatch: AppDispatch) => {
  dispatch(closePlayerAction());
};

export const expandPlayer = () => async (dispatch: AppDispatch) => {
  dispatch(expandPlayerAction());
};

export const setCurrentTrack =
  (currentTrack: Track) => async (dispatch: AppDispatch) => {
    dispatch(setCurrentTrackAction({ currentTrack }));
  };

export default playerSlice.reducer;
