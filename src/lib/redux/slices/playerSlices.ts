import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Album, Playlist, Track } from "@spotify/web-api-ts-sdk";

interface IPlayer {
  state: "open" | "closed";
  track: Track | undefined;
  type: "single" | "playlist" | "album";
  size: "compact" | "full";
  src: string;
  currentTrack: Track | undefined;
}

const initialState: IPlayer = {
  state: "closed",
  track: undefined,
  type: "single",
  size: "compact",
  src: "",
  currentTrack: undefined,
};

export const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setCurrentTrack: (state, action: PayloadAction<Track>) => {
      state.currentTrack = action.payload;
    },
    setTrack: (state, action: PayloadAction<Track | undefined>) => {
      state.state = "open";
      state.track = action.payload;
      state.size = "compact";
      state.type = "single";
      state.src = action.payload 
        ? `https://open.spotify.com/embed/track/${action.payload.id}?utm_source=generator`
        : "";
    },
    setPlaylist: (state, action: PayloadAction<Playlist | undefined>) => {
      state.state = "open";
      state.track = undefined;
      state.size = "full";
      state.type = "playlist";
      state.src = action.payload
        ? `https://open.spotify.com/embed/playlist/${action.payload.id}?utm_source=generator`
        : "";
    },
    setAlbum: (state, action: PayloadAction<Album | undefined>) => {
      state.state = "open";
      state.track = undefined;
      state.size = "full";
      state.type = "playlist";
      state.src = action.payload
        ? `https://open.spotify.com/embed/album/${action.payload.id}?utm_source=generator`
        : "";
    },
    closePlayer: (state) => {
      state.state = "closed";
    },
    expandPlayer: (state) => {
      state.size = state.size === "compact" ? "full" : "compact";
    },
  },
});

// Export actions directly
export const {
  setTrack,
  setPlaylist,
  setAlbum,
  closePlayer,
  expandPlayer,
  setCurrentTrack,
} = playerSlice.actions;

export default playerSlice.reducer;