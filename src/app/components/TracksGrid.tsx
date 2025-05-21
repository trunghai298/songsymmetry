/* eslint-disable @next/next/no-img-element */
import { Track } from "@spotify/web-api-ts-sdk";
import { memo } from "react";
import { useRouter } from "next/navigation";

type TracksGridProps = {
  tracks: Track[];
  onClickTrack?: (track: Track) => void;
  selectedTrack?: Track | undefined;
};

// Memoized track card component
const TrackCard = memo(({ 
  track, 
  selectedTrack, 
  onClickTrack,
  onArtistClick
}: { 
  track: Track, 
  selectedTrack?: Track, 
  onClickTrack?: (track: Track) => void,
  onArtistClick: (artistId: string) => void
}) => {
  const isSelected = selectedTrack?.id === track.id;
  
  return (
    <div className="flex flex-col space-y-2" key={track.id}>
      <div className="relative">
        <img
          src={track.album.images[0].url}
          alt=""
          className="rounded-md"
          width={200}
          height={200}
          loading="lazy"
        />
        <div
          className={`h-full w-full absolute top-0 left-0 flex justify-center items-center ${
            isSelected ? `opacity-100` : `opacity-0`
          } ${selectedTrack ? "hover:opacity-100" : ""} cursor-pointer`}
          onClick={() => onClickTrack?.(track)}
        >
          {isSelected ? (
            <i className="bi bi-pause-circle-fill text-gray-300 text-4xl" />
          ) : (
            <i className="bi bi-play-circle-fill text-gray-300 text-4xl"></i>
          )}
        </div>
      </div>
      <h3
        className="text-lg font-bold cursor-pointer hover:underline"
        onClick={() => onClickTrack?.(track)}
      >
        {track.name}
      </h3>
      <p
        className="text-gray-500 cursor-pointer hover:underline"
        onClick={() => onArtistClick(track.artists[0].id)}
      >
        {track.artists[0].name}
      </p>
    </div>
  );
});

TrackCard.displayName = 'TrackCard';

function TracksGrid(props: TracksGridProps) {
  const { tracks, onClickTrack, selectedTrack } = props;
  const router = useRouter();
  
  if (!tracks || tracks.length === 0) {
    return null;
  }
  
  const handleArtistClick = (artistId: string) => {
    router.push(`/artist/${artistId}`);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track}
          selectedTrack={selectedTrack}
          onClickTrack={onClickTrack}
          onArtistClick={handleArtistClick}
        />
      ))}
    </div>
  );
}

export default memo(TracksGrid);