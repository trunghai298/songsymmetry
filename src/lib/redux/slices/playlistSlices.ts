import { PayloadAction, createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { PlaylistedTrack, SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";
import { map } from "lodash";
import sdk from "../../spotify-sdk/ClientInstance";

export type PlaylistTracks = {
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
      action: PayloadAction<PlaylistTracks[] | SimplifiedPlaylist[] | undefined>
    ) => {
      if (action.payload && action.payload.length > 0) {
        // Check if the payload already has the 'tracks' property
        const hasTracksProp = 'tracks' in action.payload[0];
        
        if (hasTracksProp) {
          // It's already PlaylistTracks[]
          state.playlist = action.payload as PlaylistTracks[];
        } else {
          // It's SimplifiedPlaylist[], we'll set undefined temporarily
          // and rely on fetchPlaylistsWithTracks to populate it
          state.playlist = undefined;
        }
      } else {
        state.playlist = undefined;
      }
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
  if (!playlists || playlists.length === 0) {
    return setPlaylist(undefined);
  }
  return fetchPlaylistsWithTracks(playlists);
};

export default playlistSlice.reducer;