import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Album, Playlist, Track } from "@spotify/web-api-ts-sdk";

interface IPlayer {
  state: "open" | "closed";
  track: Track | undefined;
  type: "single" | "playlist" | "album";
  size: "compact" | "full";
  src: string;
  currentTrack: Track | undefined;
  queue: Track[];
  currentIndex: number;
  autoPlay: boolean;
}

const initialState: IPlayer = {
  state: "closed",
  track: undefined,
  type: "single",
  size: "compact",
  src: "",
  currentTrack: undefined,
  queue: [],
  currentIndex: -1,
  autoPlay: false,
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
    setQueue: (state, action: PayloadAction<Track[]>) => {
      state.queue = action.payload;
      state.currentIndex = 0;
    },
    addToQueue: (state, action: PayloadAction<Track>) => {
      state.queue.push(action.payload);
    },
    playNext: (state) => {
      if (state.currentIndex < state.queue.length - 1) {
        state.currentIndex++;
        const nextTrack = state.queue[state.currentIndex];
        state.track = nextTrack;
        state.state = "open";
        state.src = `https://open.spotify.com/embed/track/${nextTrack.id}?utm_source=generator`;
      }
    },
    playPrevious: (state) => {
      if (state.currentIndex > 0) {
        state.currentIndex--;
        const prevTrack = state.queue[state.currentIndex];
        state.track = prevTrack;
        state.state = "open";
        state.src = `https://open.spotify.com/embed/track/${prevTrack.id}?utm_source=generator`;
      }
    },
    setAutoPlay: (state, action: PayloadAction<boolean>) => {
      state.autoPlay = action.payload;
    },
    playFromQueue: (state, action: PayloadAction<{ tracks: Track[], index: number }>) => {
      state.queue = action.payload.tracks;
      state.currentIndex = action.payload.index;
      const track = state.queue[state.currentIndex];
      state.track = track;
      state.state = "open";
      state.size = "compact";
      state.type = "single";
      state.src = `https://open.spotify.com/embed/track/${track.id}?utm_source=generator`;
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
  setQueue,
  addToQueue,
  playNext,
  playPrevious,
  setAutoPlay,
  playFromQueue,
} = playerSlice.actions;

export default playerSlice.reducer;
