/* eslint-disable @next/next/no-img-element */
"use client";
import {
  Artist,
  Page,
  SimplifiedAlbum,
  TopTracksResult,
} from "@spotify/web-api-ts-sdk";
import React, { useEffect, useState } from "react";
import sdk from "../../../lib/spotify-sdk/ClientInstance";
import { Loader } from "@/app/components/core/Loader";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setTrack } from "@/lib/redux/slices/playerSlices";
import { usePlayer } from "@/hooks/usePlayer";
import { toast } from "@/hooks/use-toast";
import Container from "@/app/components/core/Container";
import { useRouter } from "next/navigation";
import { millisToMinutesAndSeconds } from "@/utils";
import Link from "next/link";

function ArtistPage({ params }: { params: { id: string } }) {
  const [artist, setArtist] = useState<Artist>();
  const [albums, setAlbums] = useState<Page<SimplifiedAlbum>>();
  const [topTracks, setTracks] = useState<TopTracksResult>();
  const dispatch = useAppDispatch();
  const { startPlayback } = usePlayer();
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    (async () => {
      window.scrollTo(0, 0);
      const [artist, albums, topTracks] = await Promise.all([
        sdk.artists.get(id),
        sdk.artists.albums(id, "single,album"),
        sdk.artists.topTracks(id, "US"),
      ]);
      setTracks(topTracks);
      setAlbums(albums);
      setArtist(artist);
    })();
  }, [id]);

  const onClickTrack = async (track: any) => {
    try {
      // Update Redux store for background image and UI state
      dispatch(setTrack(track));

      // Play the track using Spotify Web API
      await startPlayback([track.uri]);

      toast({
        title: "Now Playing",
        description: `${track.name} by ${track.artists[0].name}`,
      });
    } catch (error) {
      console.error("Error playing track:", error);
      toast({
        title: "Playback Error",
        description:
          "Could not start playback. Make sure Spotify is open and you have Premium.",
        variant: "destructive",
      });
    }
  };

  if (!artist || !albums) {
    return <Loader />;
  }

  return (
    <Container>
      <div className="w-full flex flex-col space-y-8">
        <div className="w-full flex flex-row justify-start items-center">
          <i
            className="bi bi-arrow-left text-white text-left text-2xl cursor-pointer"
            onClick={() => {
              router.back();
            }}
          />
        </div>
        <div className="w-full flex flex-col gap-x-8 md:flex-row">
          <div className="flex flex-col justify-start items-start">
            {artist.images.length > 0 && (
              <img
                src={artist.images[0].url}
                alt=""
                className="w-full aspect-video md:max-w-[250px] md:aspect-square object-cover object-center rounded-lg shadow-md"
              />
            )}
            <div className="w-full py-4">
              <h1 className="text-4xl font-bold text-white flex">
                {artist.name}
                <span className="ml-2 flex items-start">
                  <i className="bi bi-patch-check-fill text-lg"></i>
                </span>
              </h1>
              <p className="text-white text-md font-medium">
                {artist.followers.total} Followers
              </p>
              <p className="text-white text-md font-medium">
                Popularity score: {artist.popularity}
              </p>
              <Link
                href={artist.external_urls.spotify}
                target="_blank"
                className="text-md font-medium hover:cursor-pointer hover:underline text-spotify-green"
              >
                Open in Spotify{" "}
                <i className="bi bi-box-arrow-up-right text-sm" />
              </Link>
            </div>
          </div>
          <div className="grow sm:mt-8 md:mt-0 lg:mt-0 xl:mt-0 overflow-scroll">
            <h2 className="text-2xl font-bold text-white mb-4">Top Tracks</h2>
            <table className="table-auto w-full">
              <thead className="border-b-[0.5px] border-gray-500">
                <tr>
                  <th className="text-left text-gray-400 text-sm">#</th>
                  <th className="text-left text-gray-400 text-sm">Title</th>
                  <th className="text-left text-gray-400 text-sm">Album</th>
                  <th className="text-left">
                    <i className="bi bi-clock text-white w-[10px] h-[10px]" />
                  </th>
                </tr>
              </thead>
              <tbody className="border-t-[15px] border-transparent">
                {topTracks?.tracks.map((track, index) => (
                  <tr key={track.id} className="h-[40px]">
                    <td className="text-white">
                      <h2 className="text-gray-400 text-sm">{index + 1}</h2>
                    </td>
                    <td className="min-h-[40px] max-w-[300px] gap-x-2 text-white hover:underline hover:cursor-pointer overflow-ellipsis">
                      <div className="flex items-center gap-x-2">
                        <img
                          src={track.album.images[0].url}
                          alt=""
                          width={30}
                          height={30}
                          className="rounded-sm object-cover object-center"
                        />
                        <h2
                          className="line-clamp-1 text-md font-bold cursor-pointer"
                          onClick={() => onClickTrack(track)}
                        >
                          {track.name}
                        </h2>
                      </div>
                    </td>
                    <td
                      className="text-gray-400 cursor-pointer hover:underline"
                      onClick={() =>
                        router.push(`/tracks?type=album&id=${track.album.id}`)
                      }
                    >
                      <h3 className="line-clamp-1 text-sm">
                        {track.album.name}
                      </h3>
                    </td>
                    <td className="text-gray-400 text-sm">
                      {millisToMinutesAndSeconds(track.duration_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="w-full mt-10">
          <h1 className="text-2xl font-bold text-white mb-4">Albums</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-8">
            {albums.items.map((album) => (
              <div
                key={album.id}
                className="flex flex-col w-fit"
                onClick={() => router.push(`/tracks?type=album&id=${album.id}`)}
              >
                <img
                  src={album.images[0].url}
                  alt=""
                  width={200}
                  height={200}
                  className="w-fit object-cover object-top rounded-lg shadow-md"
                />
                <h2 className="text-white text-left mt-2 hover:cursor-pointer hover:underline">
                  {album.name}
                </h2>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

export default ArtistPage;
