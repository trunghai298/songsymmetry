/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useState } from "react";
import { useAppDispatch } from "../../lib/redux/hooks";
import { Page, SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import sdk from "../../lib/spotify-sdk/ClientInstance";
import { map } from "lodash";
import { Loader } from "./core/Loader";
import { fetchPlaylistsWithTracks } from "../../lib/redux/slices/playlistSlices";

function UserPlaylists() {
  const [playlists, setPlaylists] = useState<Page<SimplifiedPlaylist>>();
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const results = await sdk.currentUser.playlists.playlists(50);
        setPlaylists(results);
        const wrappedPlaylist = results.items.filter((p) =>
          p.name.includes("Top Songs")
        );
        // Use fetchPlaylistsWithTracks to properly load the playlist tracks
        if (wrappedPlaylist.length > 0) {
          dispatch(fetchPlaylistsWithTracks(wrappedPlaylist));
        }
      } catch (error: any) {
        signOut();
      }
    })();
  }, [dispatch]);

  if (!playlists) {
    return <Loader />;
  }

  return (
    <div className="mt-10 flex flex-col space-y-4 relative">
      <h2 className="text-2xl text-white font-bold mb-2">Playlists</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
        {map(playlists.items, (playlist) => (
          <div
            className="flex flex-col space-y-2"
            key={playlist.id}
            onClick={() =>
              router.push(`/tracks?type=playlist&id=${playlist.id}`)
            }
          >
            <div className="relative">
              <img
                src={playlist.images[0]?.url}
                alt=""
                className="rounded-md aspect-square object-cover"
                width={200}
                height={200}
                loading="lazy"
              />
            </div>
            <h3 className="w-full text-lg font-bold cursor-pointer hover:underline text-ellipsis overflow-hidden">
              {playlist.name}
            </h3>
            <p className="w-full text-gray-500 cursor-pointer hover:underline text-ellipsis overflow-hidden">
              {playlist.owner.display_name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserPlaylists;