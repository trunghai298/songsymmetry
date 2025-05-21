/* eslint-disable @next/next/no-img-element */
import React, { memo } from 'react';
import { Track } from "@spotify/web-api-ts-sdk";
import TracksGrid from "../TracksGrid";
import { Loader } from "../core/Loader";

interface SearchResultsProps {
  searchQuery: string;
  searchResult?: Track[];
  yourTopTracks?: Track[];
  isLoading: boolean;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClickRecommendTrack: (track: Track) => void;
}

// Memoized track item component
const TrackItem = memo(({ track, onClick }: { track: Track, onClick: () => void }) => (
  <div className="w-full flex flex-col" key={track.id}>
    <div
      className="w-full flex flex-row space-x-4 justify-start items-center px-2 py-1 rounded-md hover:bg-gray-400 cursor-pointer"
      onClick={onClick}
    >
      <img
        width={100}
        height={100}
        className="w-[40px] h-[40px] object-contain rounded-md"
        src={track.album.images[0].url}
        alt=""
        loading="lazy"
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
));

TrackItem.displayName = 'TrackItem';

// Main component with memoization
const SearchResults = memo(({
  searchQuery,
  searchResult,
  yourTopTracks,
  isLoading,
  onQueryChange,
  onClickRecommendTrack
}: SearchResultsProps) => {
  if (isLoading) return <Loader />;
  
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
              <TrackItem 
                key={track.id} 
                track={track} 
                onClick={() => onClickRecommendTrack(track)}
              />
            ))}
          </div>
        ) : (
          <div className="w-full flex flex-col space-y-4">
            <h3 className="text-md font-medium text-white">
              Or Find Similar Song to Your Top Tracks
            </h3>
            {yourTopTracks && (
              <TracksGrid
                tracks={yourTopTracks}
                onClickTrack={onClickRecommendTrack}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
});

SearchResults.displayName = 'SearchResults';

export default SearchResults;