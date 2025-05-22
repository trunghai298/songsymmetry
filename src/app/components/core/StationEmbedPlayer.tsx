'use client';

import React from 'react';

interface StationEmbedPlayerProps {
  id: string;
  type: 'track' | 'playlist' | 'album';
  width?: string | number;
  height?: string | number;
}

const StationEmbedPlayer: React.FC<StationEmbedPlayerProps> = ({
  id,
  type,
  width = '100%',
  height = '80px',
}) => {
  const baseUrl = 'https://open.spotify.com/embed';
  const embedUrl = `${baseUrl}/${type}/${id}?utm_source=generator`;

  return (
    <iframe
      src={embedUrl}
      width={width}
      height={height}
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      className="rounded-md"
    ></iframe>
  );
};

export default StationEmbedPlayer;