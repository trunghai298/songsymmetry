/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/redux/hooks";
import { useRouter } from "next/navigation";
import sdk from "../../lib/spotify-sdk/ClientInstance";
import Container from "../components/core/Container";
import { debounce, forEach, map, omit } from "lodash";
import { AudioFeatures, Page, Playlist, Track } from "@spotify/web-api-ts-sdk";
import { setCurrentTrack, setTrack } from "../../lib/redux/slices/playerSlices";
import Tooltip from "../components/Tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogClose } from "@radix-ui/react-dialog";
import { Loader } from "../components/core/Loader";
import TracksGrid from "../components/TracksGrid";
import { setOpenSubscribeDialog } from "@/lib/redux/slices/subscribeSlices";
import "./style.css";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

type SongRecommendation = {
  source: Track;
  recommendation: {
    tracks: Track[];
    seeds: {
      id: string;
      href: string;
      type: string;
      initialPoolSize: number;
      afterFilteringSize: number;
      afterRelinkingSize: number;
    }[];
  };
};

function SongSymmetry() {
  const [yourTopTracks, setYourTopTracks] = useState<Page<Track>>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResult, setSearchResult] = useState<Track[]>();
  const [songRecommendation, setSongRecommendation] =
    useState<SongRecommendation>();
  const [playlist, setPlaylist] = useState<{
    state:
      | "idle"
      | "saving"
      | "saved"
      | "loading"
      | "success"
      | "error"
      | "refreshing"
      | "refreshed";
    playlist?: Playlist;
  }>({ state: "idle" });
  const [recommendationState, setRecommendationState] = useState({
    fetching: false,
    fetchNext: false,
    nextTrackId: "",
  });

  const [songLyrics, setSongLyrics] = useState<string>("loading");
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { toast } = useToast();

  const { currentTrack } = useAppSelector((state) => state.player);

  const onQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    debounceSearch(e.target.value);
  };

  const onSearchTrack = async (q: string) => {
    if (q.length > 2) {
      const results = await sdk.search(q, ["track"], undefined, 10);
      setSearchResult(results.tracks.items);
    } else {
      setSearchResult(undefined);
    }
  };

  const onGetRecommendation = async (track: Track) => {
    setRecommendationState((state) => ({ ...state, fetching: true }));

    // const results = await sdk.recommendations.get({
    //   seed_tracks: [track.id],
    //   limit: 20,
    // });

    setRecommendationState({
      fetching: false,
      fetchNext: false,
      nextTrackId: "",
    });
    setSongRecommendation({
      source: track,
      recommendation: { tracks: [track] },
    });
  };

  const onRefreshRecommendation = async () => {
    try {
      setPlaylist({ state: "refreshing" });
      // await onGetRecommendation(songRecommendation?.source as Track);
      toast({
        title: "Recommendation refreshed!",
        description: "Enjoy the new songs.",
      });
    } catch (error) {}
    setPlaylist({ state: "refreshed" });
  };

  const checkUserPermission = async () => {
    try {
      const user = await sdk.currentUser.profile();
      if (!user) return;
      if (user.product !== "premium") {
        toast({
          title: "Premium Required!",
          description: "Please upgrade to premium to use this feature.",
        });
        return;
      }

      const playing = await sdk.player.getCurrentlyPlayingTrack();
      if (!playing) {
        toast({
          title: "No active device!",
          description: "Please play a song to use this feature.",
        });
        return;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error!",
        description: "Please try again later.",
      });
    }
  };

  const onAddSongToQueue = async (trackUri: string) => {
    await checkUserPermission();
    await sdk.player.addItemToPlaybackQueue(trackUri);
    toast({
      title: "Song added to queue 🥳!",
      description: "Enjoy the music.",
    });
  };

  const addAllSongsToQueue = async () => {
    try {
      setPlaylist({ state: "saving" });

      await checkUserPermission();
      const uris = songRecommendation?.recommendation.tracks.map(
        (track) => track.uri
      );
      await Promise.all(
        map(uris, async (uri) => {
          return sdk.player.addItemToPlaybackQueue(uri);
        })
      );

      toast({
        title: "Songs added to queue 🥳!",
        description: "Enjoy the music.",
      });
      setPlaylist({ state: "saved" });
    } catch (error) {
      console.log("error", error);
      toast({
        title: "Error!",
        description: "Please try again later.",
      });
    }
  };

  const onSavePlaylist = async () => {
    try {
      setPlaylist({ state: "loading" });
      const user = await sdk.currentUser.profile();
      if (!songRecommendation || !user) return;
      const payload = {
        name: `Song Likes: ${songRecommendation?.source.name} - ${songRecommendation?.source.artists[0].name} [Generated by Song Symmetry]`,
        description: `Songs have similar vibe to the ${songRecommendation?.source.name}. Enjoy :)`,
        public: true,
      };
      const playlist = await sdk.playlists.createPlaylist(user.id, payload);
      if (playlist) {
        const uris = songRecommendation.recommendation.tracks.map(
          (track) => track.uri
        );
        await sdk.playlists.addItemsToPlaylist(playlist.id, uris);
      }
      setPlaylist({ state: "success", playlist });
    } catch (error) {
      setPlaylist({ state: "error" });
      console.log(error);
    }
  };

  useEffect(() => {
    (async () => {
      if (!recommendationState.nextTrackId) return;
      try {
        const track = await sdk.tracks.get(recommendationState.nextTrackId);
        console.log("track: ", track);
        onGetRecommendation(track);
      } catch (error: any) {
        if (error.message.includes("exceeded its rate limits")) {
          toast({
            title: "Rate limit exceeded!",
            description: "Please try again later.",
          });
          setRecommendationState({
            fetching: false,
            fetchNext: false,
            nextTrackId: "",
          });
        }
      }
    })();
  }, [recommendationState.nextTrackId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get("trackId");
    if (trackId) {
      setRecommendationState({
        fetching: true,
        fetchNext: false,
        nextTrackId: trackId,
      });
    }

    sdk.player.getCurrentlyPlayingTrack().then((track) => {
      console.log("track", track);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const results = await sdk.currentUser.topItems(
          "tracks",
          "short_term",
          30
        );
        setYourTopTracks(results);
      } catch (error: any) {}
    })();
  }, []);

  useEffect(() => {
    if (!songRecommendation) return;
    (async () => {
      try {
        const res = await fetch(
          `https://api.lyrics.ovh/v1/${songRecommendation.source.artists[0].name}/${songRecommendation.source.name}`
        );
        const resJson = await res.json();
        if (resJson.error) {
          setSongLyrics("Lyrics not found");
        } else {
          setSongLyrics(resJson.lyrics);
        }
      } catch (error: any) {
        setSongLyrics("not found");
        toast({
          title: "Lyrics not found!",
          description: "Please try again later.",
        });
      }
    })();
  }, [songRecommendation]);

  useEffect(() => {
    sdk.player.getCurrentlyPlayingTrack().then((track) => {
      if (!track) return;
      const currentTrack = track.item as Track;
      dispatch(setCurrentTrack(currentTrack));
      toast({
        title: `You are listening to ${currentTrack.name} by ${currentTrack.artists[0].name}`,
        description: `Want to find similar songs?`,
        action: (
          <ToastAction
            altText="Find similar songs"
            onClick={() => onFindSimilarSongs(currentTrack.id)}
          >
            Find
          </ToastAction>
        ),
      });
    });
  }, []);

  const debounceSearch = debounce(onSearchTrack, 1000);

  const backAction = () => {
    return (
      <div className="w-full flex flex-row justify-start items-center">
        <i
          className="bi bi-arrow-left text-white text-left text-2xl cursor-pointer"
          onClick={() => {
            setSongRecommendation(undefined);
            setSongLyrics("");
          }}
        />
      </div>
    );
  };
  const renderSongDetails = () => {
    if (!songRecommendation) return null;
    return (
      <div className="w-full flex flex-col space-y-8 justify-center items-center">
        <div className="w-full flex flex-col space-y-4 sm:flex-row sm:space-y-0 space-x-2 md:space-x-4 justify-start md:items-end">
          <div className="h-[220px] sm:h-[350px] sm:w-[40%] md:w-[40%] ld:w-[40%] xl:w-[50%] flex flex-row items-start justify-start space-x-4 sm:space-x-2 md:space-x-4 p-3 sm:p-6 rounded-xl bg-gray-900 overflow-hidden">
            <div className="flex flex-col max-w-[40%] space-y-2 sm:space-y-4">
              <div className="relative h-full">
                <img
                  src={songRecommendation.source.album.images[0].url}
                  alt=""
                  className="object-contain rounded-md w-full h-full max-w-[100px] md:max-w-[150px] lg:max-w-[200px]"
                />
                {/* <div
                  className={`h-full w-full absolute top-0 left-0 flex justify-center items-center opacity-0 hover:opacity-100 cursor-pointer`}
                  onClick={() => dispatch(setTrack(songRecommendation.source))}
                >
                  <i className="bi bi-play-circle-fill text-gray-300 text-4xl"></i>
                </div> */}
              </div>
              <div className="flex flex-col space-y-1">
                <div className="w-full flex flex-tow items-start justify-start space-x-2">
                  <h1 className="w-full line-clamp-2 text-lg sm:text-2xl md:text-3xl font-bold sm:font-extrabold text-white">
                    {songRecommendation.source.name}
                  </h1>
                  {songRecommendation.source.explicit && (
                    <i className="bi bi-explicit-fill" />
                  )}
                </div>
                <div className="flex flex-row items-center space-x-1">
                  <h2
                    className="w-full text-md font-bold text-white overflow-hidden text-ellipsis cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(
                        `/artist/${songRecommendation.source.artists[0].id}`
                      );
                    }}
                  >
                    {songRecommendation.source.artists
                      .map((artist) => artist.name)
                      .join(", ")}
                  </h2>
                </div>
              </div>
            </div>
            <div className="w-auto h-full overflow-hidden text-ellipsis">
              <h3 className="text-md text-left font-bold text-gray-300">
                Lyrics
              </h3>
              <div className="h-[60%] sm:h-[80%] p-y-2 overflow-hidden text-ellipsis">
                {songLyrics === "loading" ? (
                  <h4 className="text-sm text-left font-thin text-gray-400">
                    Loading...
                  </h4>
                ) : (
                  <p className="text-sm text-left font-thin overflow-hidden text-ellipsis whitespace-pre-line text-gray-400">
                    {songLyrics}
                  </p>
                )}
              </div>
              <Dialog>
                {songLyrics !== "loading" &&
                  songLyrics !== "failed" &&
                  songLyrics !== "not found" && (
                    <DialogTrigger asChild>
                      <h3 className="text-white mt-4 text-sm font-bold underline cursor-pointer">
                        Show Full Lyrics
                      </h3>
                    </DialogTrigger>
                  )}
                <DialogContent className="h-[80%] rounded-3xl border-none p-2 sm:p-8 bg-gray-700">
                  <DialogHeader className="sticky top-0">
                    <DialogTitle className="text-xl sm:text-2xl font-bold">
                      {songRecommendation.source.name}
                    </DialogTitle>
                    <DialogDescription className="text-lg font-normal">
                      {songRecommendation.source.artists
                        .map((artist) => artist.name)
                        .join(", ")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-6 overflow-y-scroll">
                    <p className="text-md text-left font-light whitespace-pre-line text-gray-200">
                      {songLyrics}
                    </p>
                  </div>
                  <DialogFooter>
                    <h3 className="text-white text-sm font-bold text-center">
                      Lyrics provided by{" "}
                      <a
                        className="underline"
                        href="https://genius-lyrics.js.org/"
                        target="_blank"
                      >
                        Genius
                      </a>
                    </h3>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const onFindSimilarSongs = (trackId: string) => {
    router.replace(`?trackId=${trackId}`);
    setRecommendationState({
      fetching: false,
      fetchNext: true,
      nextTrackId: trackId,
    });
    setSongLyrics("loading");
  };

  const renderSongSimilarity = () => {
    return (
      <div className="w-full flex flex-col space-y-8 p-8 rounded-xl bg-gray-900">
        <div className="w-full flex flex-col md:flex-row space-y-2 justify-between items-center">
          <h3 className="text-xl sm:text-3xl text-left font-bold text-spotify-green-dark flex">
            Songs Have Similar Vibes
          </h3>
          <div className="flex flex-col md:flex-row justify-between gap-4 ms:gap-3">
            <Button
              size={"lg"}
              className="button-85 flex gap-1"
              onClick={onRefreshRecommendation}
              disabled={playlist.state === "refreshing"}
            >
              <i className="bi bi-arrow-clockwise text-white text-2xl" />
              <h3 className="text-white text-md font-bold">
                {playlist.state === "refreshing"
                  ? "Generating..."
                  : "Regenerate"}
              </h3>
            </Button>

            <Button
              size={"lg"}
              className="flex items-center flex-row justify-center sm:justify-between space-x-2  bg-spotify-green-dark hover:bg-spotify-green-light disabled:bg-spotify-green-dark rounded-3xl"
              onClick={addAllSongsToQueue}
              disabled={playlist.state === "saving"}
            >
              <i className="bi bi-vinyl-fill text-white text-2xl" />
              <h3 className="text-white text-md font-bold">
                {playlist.state === "saving"
                  ? "Saving..."
                  : "Add Songs to Queue"}
              </h3>
            </Button>
            <Button
              size={"lg"}
              className="flex items-center flex-row justify-center sm:justify-between space-x-2  bg-spotify-green-dark hover:bg-spotify-green-light disabled:bg-spotify-green-dark rounded-3xl"
              onClick={onSavePlaylist}
              disabled={playlist.state === "loading"}
            >
              <i className="bi bi-spotify text-white text-2xl" />
              <h3 className="text-white text-md font-bold">
                {playlist.state === "loading" ? "Saving..." : "Save Playlist"}
              </h3>
            </Button>
          </div>
        </div>
        <div className="w-full rounded-sm flex flex-col space-y-4">
          {songRecommendation?.recommendation.tracks.map((track) => {
            const artists = track.artists.map((artist) => artist.name);

            return (
              <div className="w-full flex flex-col" key={track.id}>
                <div className="w-full flex flex-row space-x-4 justify-start items-center rounded-md cursor-pointer">
                  <img
                    width={100}
                    height={100}
                    className="w-[40px] h-[40px] object-contain rounded-lg"
                    src={track.album.images[0].url}
                    alt=""
                  />
                  <div className="flex flex-col grow space-y-1">
                    <div className="flex flex-row space-x-1 overflow-hidden text-ellipsis">
                      <h2 className="text-md sm:text-lg line-clamp-1 font-bold text-white">
                        {track.name}
                      </h2>
                      {track.explicit && (
                        <i className="bi bi-explicit-fill text-sm" />
                      )}
                    </div>
                    <div className="flex flex-row space-x-1">
                      <h2
                        className="text-md font-normal text-white overflow-hidden text-ellipsis cursor-pointer hover:underline"
                        onClick={() =>
                          router.push(`/artist/${track.artists[0].id}`)
                        }
                      >
                        {artists.join(", ")}
                      </h2>
                    </div>
                  </div>
                  <div className="flex flex-row space-x-1 items-center">
                    <h3 className="text-md font-bold text-white">
                      {/* Similarity: {calculateCosineSimilarity(track)} */}
                    </h3>
                  </div>
                  <Tooltip text="Add this song to queue">
                    <i
                      className="bi bi-vinyl-fill text-white text-xl"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddSongToQueue(track.uri);
                      }}
                    />
                  </Tooltip>
                  <Tooltip text="Get Similar Songs">
                    <i
                      className="bi bi-search text-white text-xl"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onFindSimilarSongs(track.id);
                      }}
                    />
                  </Tooltip>
                  <i
                    className="bi bi-play-circle-fill text-white text-2xl"
                    onClick={() => dispatch(setTrack(track))}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {/* <div className="w-full flex flex-row space-x-4 justify-center items-center">
          <Button
            onClick={() => dispatch(setOpenSubscribeDialog())}
            variant="outline"
            className="w-full sm:w-[400px] p-6 sm:p-8 text-xl sm:text-2xl font-bold text-spotify-green hover:text-spotify-green-light"
          >
            Want More Songs Like This?
          </Button>
        </div> */}
      </div>
    );
  };

  const renderRecommendations = () => {
    if (recommendationState.fetching && playlist.state !== "refreshing")
      return <Loader />;
    return (
      <div className="w-full flex flex-col space-y-8 justify-center items-center">
        {backAction()}
        {renderSongDetails()}
        {renderSongSimilarity()}
      </div>
    );
  };

  const onClickRecommendTrack = (track: Track) => {
    setRecommendationState({
      fetching: false,
      fetchNext: true,
      nextTrackId: track.id,
    });
  };

  const renderSearchResult = () => {
    if (recommendationState.fetching) return <Loader />;
    return (
      <>
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="w-full flex flex-col space-y-2 justify-center items-center">
            <h1 className="text-4xl font-bold text-white flex">
              Song Symmetry
            </h1>
            <h2 className="text-lg font-light text-gray-300 flex">
              Find Songs in the Same Vibes
            </h2>
          </div>
        </div>
        <div
          className={`w-full flex flex-col ${
            searchResult ? `space-y-2` : `space-y-10`
          } justify-center items-center`}
        >
          <input
            className="flex w-80 sm:w-[600px] h-14 text-white rounded-md border border-white border-input bg-background px-3 py-2 text-sm sm:text-md md:text-lg select-none ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type a song name"
            type="text"
            value={searchQuery}
            onChange={onQueryChange}
          />
          {searchResult ? (
            <div className="w-80 sm:w-[600px] max-h-[400px] sm:max-h-[600px] overflow-y-scroll rounded-sm flex flex-col p-4 space-y-4 bg-white">
              {searchResult.map((track) => (
                <div className="w-full flex flex-col" key={track.id}>
                  <div
                    className="w-full flex flex-row space-x-4 justify-start items-center px-2 py-1 rounded-md hover:bg-gray-400 cursor-pointer"
                    // onClick={() => onGetRecommendation(track)}
                  >
                    <img
                      width={100}
                      height={100}
                      className="w-[40px] h-[40px] object-contain rounded-md"
                      src={track.album.images[0].url}
                      alt=""
                    />
                    <div className="flex flex-col grow space-y-1">
                      <h2 className="text-lg font-bold text-gray-900">
                        {track.name}
                      </h2>
                      <h2 className="text-md font-normal text-gray-500 overflow-hidden text-ellipsis">
                        {track.artists.map((artist) => artist.name).join(", ")}
                      </h2>
                    </div>
                    <i className="bi bi-chevron-right text-white text-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full flex flex-col space-y-4">
              <h3 className="text-md font-medium text-white">
                Or Find Similar Song to Your Top Tracks
              </h3>
              <TracksGrid
                tracks={yourTopTracks?.items as Track[]}
                onClickTrack={onClickRecommendTrack}
              />
            </div>
          )}
        </div>
      </>
    );
  };

  const renderPlaylistDialog = () => {
    return (
      <Dialog open={playlist.state === "success"}>
        <DialogClose onClick={() => setPlaylist({ state: "idle" })}>
          <DialogContent className="rounded-3xl border-none p-8 bg-gray-900 flex flex-col justify-center text-center items-center">
            <DialogHeader className="text-center">
              <span className="text-6xl">&#127881;</span>
              <h1 className="text-2xl w-full sm:text-3xl md:text-4xl font-bold text-white">
                Saved to your account
              </h1>
              <h2 className="text-md sm:text-lg font-light text-gray-300 w-100 sm:w-90">
                The playlist is now available in your Spotify library. Also you
                can find it anytime in Song Symmetry.
              </h2>{" "}
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => {
                  router.push(
                    `/tracks?type=playlist&id=${playlist.playlist?.id}`
                  );
                }}
                className="w-auto min-w-[150px] font-bold"
                variant="secondary"
              >
                Open Playlist
              </Button>
              <Button
                className="w-auto min-w-[150px] px-1 sm:px-3 py-1 sm:py-2 font-extrabold"
                onClick={() => setPlaylist({ state: "idle" })}
              >
                <i className="bi bi-spotify text-white text-md sm:text-2lg mr-2"></i>
                Open Spotify
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogClose>
      </Dialog>
    );
  };

  return (
    <Container>
      {renderPlaylistDialog()}
      <div className="flex flex-col space-y-6 items-center justify-center w-full h-full">
        {songRecommendation ? renderRecommendations() : renderSearchResult()}
      </div>
    </Container>
  );
}

export default SongSymmetry;
