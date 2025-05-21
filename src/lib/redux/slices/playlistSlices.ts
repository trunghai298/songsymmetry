import { PayloadAction, createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { PlaylistedTrack, SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";
import { map } from "lodash";
import sdk from "../../spotify-sdk/ClientInstance";

type PlaylistTracks = {
  tracks: PlaylistedTrack[];
} & SimplifiedPlaylist;

interface IPlaylist {
  playlist: PlaylistTracks[] | undefined;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: IPlaylist = {
  playlist: undefined,
  status: 'idle',
  error: null
};

// Create an async thunk for fetching playlist data
export const fetchPlaylistsWithTracks = createAsyncThunk(
  'playlist/fetchPlaylistsWithTracks',
  async (playlists: SimplifiedPlaylist[]) => {
    const playlistData = await Promise.all(
      map(playlists, async (item) => {
        const playListTracks = await sdk.playlists.getPlaylistItems(item.id);
        return {
          ...item,
          tracks: playListTracks.items,
        };
      })
    );
    return playlistData as PlaylistTracks[];
  }
);

export const playlistSlice = createSlice({
  name: "playlist",
  initialState,
  reducers: {
    setPlaylist: (
      state,
      action: PayloadAction<PlaylistTracks[] | undefined>
    ) => {
      state.playlist = action.payload;
    },
    clearPlaylists: (state) => {
      state.playlist = undefined;
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlaylistsWithTracks.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPlaylistsWithTracks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.playlist = action.payload;
      })
      .addCase(fetchPlaylistsWithTracks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch playlists';
      });
  }
});

export const { setPlaylist, clearPlaylists } = playlistSlice.actions;

// For backward compatibility
export const fetchPlaylists = (
  playlists: SimplifiedPlaylist[] | undefined
) => {
  if (!playlists) {
    return setPlaylist(undefined);
  }
  return fetchPlaylistsWithTracks(playlists);
};

export default playlistSlice.reducer;