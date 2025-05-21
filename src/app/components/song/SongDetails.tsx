/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { SongRecommendation } from '@/hooks/useTrackRecommendations';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SongDetailsProps {
  songRecommendation: SongRecommendation;
  songLyrics: string;
}

function SongDetails({ songRecommendation, songLyrics }: SongDetailsProps) {
  const router = useRouter();
  
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
}

export default SongDetails;