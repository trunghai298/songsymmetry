"use client";
import {
  Artist,
  Page,
  SimplifiedAlbum,
  TopTracksResult,
} from "@spotify/web-api-ts-sdk";
import React, { use, useEffect, useState } from "react";
import sdk from "../../lib/spotify-sdk/ClientInstance";
import Image from "next/image";
import { Loader } from "@/app/components/Loader";
import { useAppDispatch } from "@/app/lib/redux/hooks";
import { setTrack } from "@/app/lib/redux/slices";

function ArtistPage() {
  const [artist, setArtist] = useState<Artist>();
  const [albums, setAlbums] = useState<Page<SimplifiedAlbum>>();
  const [topTracks, setTracks] = useState<TopTracksResult>();

  const dispatch = useAppDispatch();

  const millisToMinutesAndSeconds = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds: any = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  };

  useEffect(() => {
    (async () => {
      const id = window.location.pathname.split("/")[2];
      const [artist, albums, topTracks] = await Promise.all([
        sdk.artists.get(id),
        sdk.artists.albums(id, "single,album"),
        sdk.artists.topTracks(id, "KR"),
      ]);
      setTracks(topTracks);
      setAlbums(albums);
      setArtist(artist);
    })();
  }, []);

  if (!artist || !albums) {
    return <Loader />;
  }

  return (
    <div className="h-full bg-gray-900 px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-24 lg:py-10">
      <div className="w-full flex flex-col gap-x-6 md:flex-row">
        <div className="min-w-[300px] flex flex-col justify-start items-center">
          <Image
            src={artist.images[0].url}
            alt=""
            width={200}
            height={200}
            className="max-h-[200px] sm:max-h-[300px] md:max-h-[400px] w-full object-cover object-center rounded-lg shadow-md"
          />
          <div className="w-full py-4">
            <h1 className="text-4xl font-bold text-white">{artist.name}</h1>
            <p className="text-white text-md font-medium">
              {artist.followers.total} Followers
            </p>
          </div>
        </div>
        <div className="sm:mt-8 md:mt-0 lg:mt-0 xl:mt-0 overflow-scroll">
          <h2 className="text-2xl font-bold text-white mb-4">Top Tracks</h2>
          <table className="table-auto w-full">
            <thead className="border-b-[0.5px] border-gray-500">
              <tr>
                <th className="text-left text-gray-400 min-w-[30px] sm:min-w-[50px] text-sm">
                  #
                </th>
                <th className="text-left text-gray-400 min-w-[100px] sm:min-w-[150px] md:min-w-[200px] lg:min-w-[250px] xl:min-w-[400px] text-sm">
                  Title
                </th>
                <th className="text-left text-gray-400 min-w-[100px] sm:min-w-[150px] md:min-w-[200px] lg:min-w-[250px] xl:min-w-[400px] text-sm">
                  Album
                </th>
                <th className="text-left">
                  <i className="bi bi-clock text-white w-[10px] h-[10px]" />
                </th>
              </tr>
            </thead>
            <tbody className="border-t-[15px] border-transparent">
              {topTracks?.tracks.map((track, index) => (
                <tr key={track.id} className="h-auto sm:h-[30px] md:h-[50px]">
                  <td className="text-white">
                    <h2 className="text-gray-400">{index}</h2>
                  </td>
                  <td className="flex items-center w-full h-full min-h-[40px] max-w-[300px] gap-x-2 text-white hover:underline hover:cursor-pointer overflow-ellipsis">
                    <Image
                      src={track.album.images[0].url}
                      alt=""
                      width={30}
                      height={30}
                      className="rounded-sm object-cover object-center"
                    />
                    <h2 onClick={() => dispatch(setTrack(track))}>
                      {track.name}
                    </h2>
                  </td>
                  <td className="text-gray-400">{track.album.name}</td>
                  <td className="text-gray-400">
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
            <div key={album.id} className="flex flex-col w-fit">
              <Image
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
  );
}

export default ArtistPage;