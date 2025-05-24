/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/redux/hooks";
import {
  Album,
  Playlist,
  PlaylistedTrack,
  SimplifiedTrack,
  Track,
} from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import sdk from "../../lib/spotify-sdk/ClientInstance";
import {
  setAlbum,
  setPlaylist,
  setTrack,
} from "../../lib/redux/slices/playerSlices";
import { usePlayer } from "@/hooks/usePlayer";
import { cloneDeep, map, startCase, sumBy } from "lodash";
import { Loader } from "../components/core/Loader";
import Container from "../components/core/Container";
import { millisToMinAndSecs } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Tooltip from "../components/Tooltip";
import { useToast } from "@/hooks/use-toast";

type AlbumTracks = {
  type: "album";
  album: Album;
};
type PlaylistTracks = {
  type: "playlist";
  playlist: Playlist;
};

type Tracks = PlaylistTracks | AlbumTracks | undefined;

function TopTracks() {
  const [tracksData, setTracksData] = useState<Tracks | undefined>();
  const dispatch = useAppDispatch();
  const { startPlayback } = usePlayer();
  const router = useRouter();
  const { toast } = useToast();

  const openPlaylistInSpotify = (playlist: Playlist) => {
    window.open(playlist.external_urls.spotify, "_blank");
  };

  const openAlbumInSpotify = (album: Album) => {
    window.open(album.external_urls.spotify, "_blank");
  };

  useEffect(() => {
    (async () => {
      window.scrollTo(0, 0);
      const searchParams = new URLSearchParams(window.location.search);
      const type = searchParams.get("type");
      const id = searchParams.get("id");
      if (!type || !id) return;
      try {
        if (type === "playlist") {
          const playlist = await sdk.playlists.getPlaylist(id);
          setTracksData({ type, playlist });
        } else if (type === "album") {
          const album = await sdk.albums.get(id);
          setTracksData({ type, album });
        }
      } catch (error: any) {
        signOut();
      }
    })();
  }, []);

  const onClickTrack = async (track: SimplifiedTrack | PlaylistedTrack) => {
    try {
      // Update Redux store for background image and UI state
      dispatch(setTrack(track as Track));
      
      // Play the track using Spotify Web API
      await startPlayback([(track as Track).uri]);
      
      toast({
        title: "Now Playing",
        description: `${(track as Track).name} by ${(track as Track).artists[0].name}`,
      });
    } catch (error) {
      console.error('Error playing track:', error);
      toast({
        title: "Playback Error",
        description: "Could not start playback. Make sure Spotify is open and you have Premium.",
        variant: "destructive",
      });
    }
  };

  if (!tracksData) {
    return <Loader />;
  }

  const renderAlbumTracks = (album: Album) => {
    return (
      <div className="flex flex-col space-y-4 relative">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-center space-y-8">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-x-4">
              <img
                src={album.images[0].url}
                alt=""
                width={300}
                height={300}
                loading="lazy"
                className="max-h-[200px] sm:max-h-[250px] md:max-h-[250px] lg:max-h-[300px] aspect-square object-cover object-center rounded-lg shadow-md"
              />
              <div className="flex flex-col space-y-2 items-start justify-end grow">
                <h4 className="text-white text-sm font-medium">
                  {startCase(album.album_type)}
                </h4>
                <h2 className="text-white text-4xl font-extrabold cursor-pointer hover:underline">
                  {album.name}
                </h2>
                <div className="flex items-center justify-between space-x-4">
                  <h3 className="text-gray-400 text-xs sm:text-sm md:text-md font-normal">
                    {album.release_date}
                  </h3>
                  <h3 className="text-gray-400 text-xs sm:text-sm md:text-md font-normal">
                    {album.total_tracks} songs
                  </h3>
                  <h3 className="text-gray-400 text-xs sm:text-sm md:text-md font-normal">
                    {millisToMinAndSecs(
                      sumBy(album.tracks.items, (track) => track.duration_ms)
                    )}
                  </h3>
                </div>
              </div>
              <div className="w-full sm:w-auto flex flex-col space-y-2 items-start justify-end">
                <Button
                  variant="outline"
                  className="w-full min-w-[100%] sm:min-w-[300px] h-auto text-white text-xl sm:text-2xl font-bold px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => openAlbumInSpotify(album)}
                >
                  <i className="bi bi-spotify text-xl mr-2" />
                  View Album
                </Button>
                <Button
                  onClick={() => openAlbumInSpotify(album)}
                  className="w-full min-w-[100%] sm:min-w-[300px] h-auto text-white text-xl sm:text-2xl font-bold px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 rounded-full bg-spotify-green hover:bg-spotify-green/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="bi bi-spotify text-xl mr-2" />
                  Play on Spotify
                </Button>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              {map(album.tracks.items, (track) => (
                <div className="flex flex-col space-y-2" key={track.id}>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-gray-400 text-sm font-normal">
                      {track.track_number}.
                    </h3>
                    <h3
                      className="text-lg font-bold cursor-pointer hover:underline"
                      onClick={() => onClickTrack(track)}
                    >
                      {track.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-row space-x-1">
                      {track.artists.map((artist, i) => (
                        <p
                          key={artist.id}
                          className="text-gray-500 cursor-pointer hover:underline"
                          onClick={() => router.push(`/artist/${artist.id}`)}
                        >
                          {artist.name}
                          {i < track.artists.length - 1 && ", "}
                        </p>
                      ))}
                    </div>
                    <Tooltip text="Find similar songs">
                      <i
                        className="bi bi-search text-xl"
                        onClick={() => {
                          router.push(`/?trackId=${track.id}`);
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const onRemoveTrack = async (pId: string, uri: string) => {
    try {
      await sdk.playlists.removeItemsFromPlaylist(pId, {
        tracks: [{ uri: uri }],
      });
      const playlistData = cloneDeep(tracksData) as PlaylistTracks;
      const filteredTracks = playlistData.playlist.tracks.items.filter(
        (track) => track.track.uri !== uri
      );
      playlistData.playlist.tracks.items = filteredTracks;
      setTracksData(playlistData);
    } catch (error) {}
  };

  const onDeletePlaylist = async (pId: string) => {
    try {
      await sdk.currentUser.playlists.unfollow(pId);
      toast({
        title: "Playlist deleted",
        description: "Your playlist has been deleted successfully!",
      });
    } catch (error) {}
  };

  const renderPlaylistTracks = (playlist: Playlist) => {
    return (
      <div className="flex flex-col space-y-4 relative">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-center space-y-6">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-x-4 items-end justify-between">
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-x-4 grow">
                <img
                  src={playlist.images[0].url}
                  alt=""
                  className="rounded-md aspect-video sm:aspect-square sm:max-w-[200px] sm:max-h-[200px] object-cover object-top"
                  width={500}
                  height={100}
                  loading="lazy"
                />
                <div className="flex flex-col space-y-2 items-start justify-end">
                  <h4 className="text-white text-sm font-medium">
                    {startCase(playlist.type)}
                  </h4>
                  <h2 className="text-white text-4xl font-bold cursor-pointer hover:underline">
                    {playlist.name}
                  </h2>
                  <div className="flex items-center justify-between space-x-4">
                    <h3
                      className="text-white text-xs sm:text-sm md:text-md font-medium cursor-pointer hover:underline"
                      onClick={() =>
                        router.push(`/artist/${playlist.owner.id}`)
                      }
                    >
                      {playlist.owner.display_name}
                    </h3>
                    <h3 className="text-gray-400 text-xs sm:text-sm md:text-md font-normal">
                      {playlist.tracks.items.length} songs
                    </h3>
                    <h3 className="text-gray-400 text-xs sm:text-sm md:text-md font-normal">
                      {millisToMinAndSecs(
                        sumBy(
                          playlist.tracks.items,
                          (track) => track.track.duration_ms
                        )
                      )}
                    </h3>
                    <i
                      className="bi bi-trash3 text-lg cursor-pointer"
                      onClick={() => onDeletePlaylist(playlist.id)}
                    />
                  </div>
                </div>
              </div>
              <div className="w-full sm:w-auto flex flex-col space-y-2 items-start justify-end">
                <Button
                  variant="outline"
                  className="w-full min-w-[100%] sm:min-w-[300px] h-auto text-white text-xl sm:text-2xl font-bold px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => openPlaylistInSpotify(playlist)}
                >
                  <i className="bi bi-spotify text-xl mr-2" />
                  View Playlist
                </Button>
                <Button
                  onClick={() => openPlaylistInSpotify(playlist)}
                  className="w-full min-w-[100%] sm:min-w-[300px] h-auto text-white text-xl sm:text-2xl font-bold px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 rounded-full bg-spotify-green hover:bg-spotify-green/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="bi bi-spotify text-xl mr-2" />
                  Play on Spotify
                </Button>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              {map(playlist.tracks.items, (track: { track: Track }) => (
                <div
                  className="flex flex-row items-center justify-between"
                  key={track.track.id}
                >
                  <div className="flex flex-row space-x-4 flex-1 items-center justify-start">
                    <img
                      src={track.track.album.images[0].url}
                      alt=""
                      className="rounded-md w-[40px] h-[40px] aspect-square object-cover"
                      width={100}
                      height={100}
                      loading="lazy"
                    />
                    <div>
                      <div className="flex flex-row space-x-1 sm:space-x-2">
                        <h3
                          className="text-lg font-bold cursor-pointer hover:underline"
                          onClick={() => onClickTrack(track.track)}
                        >
                          {track.track.name}
                        </h3>
                        {track.track.explicit && (
                          <i className="bi bi-explicit-fill text-sm" />
                        )}
                      </div>
                      <div className="flex flex-row space-x-1">
                        {track.track.artists.map((artist, i) => (
                          <p
                            key={artist.id}
                            className="text-gray-500 cursor-pointer hover:underline"
                            onClick={() => router.push(`/artist/${artist.id}`)}
                          >
                            {artist.name}
                            {i < track.track.artists.length - 1 && ", "}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <i className="bi bi-three-dots text-lg cursor-pointer" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white text-gray-700">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/?trackId=${track.track.id}`);
                        }}
                      >
                        <i className="bi bi-search text-xl" />
                        <DropdownMenuLabel>
                          Find similar songs
                        </DropdownMenuLabel>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <i className="bi bi-trash3 text-xl" />
                        <DropdownMenuLabel
                          onClick={() =>
                            onRemoveTrack(playlist.id, track.track.uri)
                          }
                        >
                          Remove from this playlist
                        </DropdownMenuLabel>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex flex-row space-x-4 items-center justify-end"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Container>
      {tracksData.type === "album"
        ? renderAlbumTracks(tracksData.album)
        : renderPlaylistTracks(tracksData.playlist)}
    </Container>
  );
}

export default TopTracks;
