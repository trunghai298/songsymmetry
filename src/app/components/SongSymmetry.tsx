/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect } from "react";
import { Track } from "@spotify/web-api-ts-sdk";
import { usePlayer } from "@/hooks/usePlayer";
import Container from "../components/core/Container";
import sdk from "../../lib/spotify-sdk/ClientInstance";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// Custom hooks
import { useSpotifySearch } from "@/hooks/useSpotifySearch";
import { useTrackRecommendations } from "@/hooks/useTrackRecommendations";
import { useTopTracks } from "@/hooks/useTopTracks";

// Components
import SearchResults from "./song/SearchResults";
import SongDetails from "./song/SongDetails";
import SimilarSongsList from "./song/SimilarSongsList";
import PlaylistDialog from "./song/PlaylistDialog";
import { Loader } from "../components/core/Loader";

function SongSymmetry() {
  // Custom hooks
  const { searchQuery, searchResult, handleQueryChange } = useSpotifySearch();
  const { topTracks, isLoading: isLoadingTopTracks } = useTopTracks();
  const {
    songRecommendation,
    songLyrics,
    playlist,
    recommendationState,
    refreshRecommendation,
    savePlaylist,
    findSimilarSongs,
    resetRecommendation,
    addSongToQueue,
    addAllSongsToQueue,
    setPlaylist,
  } = useTrackRecommendations();

  const { updateCurrentTrack } = usePlayer();
  const { toast } = useToast();

  // Check for currently playing track on load
  useEffect(() => {
    sdk.player.getCurrentlyPlayingTrack().then((track) => {
      if (!track) return;
      const currentTrack = track.item as Track;
      updateCurrentTrack(currentTrack);
      toast({
        title: `You are listening to ${currentTrack.name} by ${currentTrack.artists[0].name}`,
        description: `Want to find similar songs?`,
        action: (
          <ToastAction
            altText="Find similar songs"
            onClick={() => findSimilarSongs(currentTrack.id)}
          >
            Find
          </ToastAction>
        ),
      });
    });
  }, [findSimilarSongs, toast]);

  const handleRecommendTrack = (track: Track) => {
    findSimilarSongs(track.id);
  };

  const backAction = () => {
    return (
      <div className="w-full flex flex-row justify-start items-center">
        <i
          className="bi bi-arrow-left text-white text-left text-2xl cursor-pointer"
          onClick={resetRecommendation}
        />
      </div>
    );
  };

  const renderRecommendations = () => {
    if (recommendationState.fetching && playlist.state !== "refreshing") {
      return <Loader />;
    }

    if (!songRecommendation) return null;

    return (
      <div className="w-full flex flex-col space-y-8 justify-center items-center">
        {backAction()}
        <SongDetails
          songRecommendation={songRecommendation}
          songLyrics={songLyrics}
        />
        <SimilarSongsList
          tracks={songRecommendation.recommendation.tracks}
          playlist={playlist}
          onRefreshRecommendation={refreshRecommendation}
          onSavePlaylist={savePlaylist}
          onAddAllSongsToQueue={addAllSongsToQueue}
          onAddSongToQueue={addSongToQueue}
          onFindSimilarSongs={findSimilarSongs}
        />
      </div>
    );
  };

  return (
    <Container>
      <PlaylistDialog
        isOpen={playlist.state === "success"}
        playlist={playlist.playlist}
        onClose={() => setPlaylist({ state: "idle" })}
      />

      <div className="flex flex-col space-y-6 items-center justify-center w-full h-full">
        {songRecommendation ? (
          renderRecommendations()
        ) : (
          <SearchResults
            searchQuery={searchQuery}
            searchResult={searchResult}
            yourTopTracks={topTracks?.items}
            isLoading={isLoadingTopTracks}
            onQueryChange={handleQueryChange}
            onClickRecommendTrack={handleRecommendTrack}
          />
        )}
      </div>
    </Container>
  );
}

export default SongSymmetry;
