/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Button } from "@/components/ui/button";
import { Track } from "@spotify/web-api-ts-sdk";
import { usePlayer } from "@/hooks/usePlayer";
import { useRouter } from 'next/navigation';
import Tooltip from '../Tooltip';
import { PlaylistState } from '@/hooks/useTrackRecommendations';

interface SimilarSongsListProps {
  tracks: Track[];
  playlist: PlaylistState;
  onRefreshRecommendation: () => Promise<void>;
  onSavePlaylist: () => Promise<void>;
  onAddAllSongsToQueue: () => Promise<void>;
  onAddSongToQueue: (trackUri: string) => Promise<void>;
  onFindSimilarSongs: (trackId: string) => void;
}

function SimilarSongsList({
  tracks,
  playlist,
  onRefreshRecommendation,
  onSavePlaylist,
  onAddAllSongsToQueue,
  onAddSongToQueue,
  onFindSimilarSongs
}: SimilarSongsListProps) {
  const { playTrack } = usePlayer();
  const router = useRouter();
  
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
            className="flex items-center flex-row justify-center sm:justify-between space-x-2 bg-spotify-green-dark hover:bg-spotify-green-light disabled:bg-spotify-green-dark rounded-3xl"
            onClick={onAddAllSongsToQueue}
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
            className="flex items-center flex-row justify-center sm:justify-between space-x-2 bg-spotify-green-dark hover:bg-spotify-green-light disabled:bg-spotify-green-dark rounded-3xl"
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
        {tracks.map((track) => {
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
                  onClick={() => playTrack(track)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SimilarSongsList;