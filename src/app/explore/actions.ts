"use server";
import { prisma } from "../../lib/prisma";

type SongParams = {
  limit?: number;
  offset?: number;
  year?: string;
  genre?: string[];
  language?: string[];
  artist?: string;
  name?: string;
  streamCount?: number;
};

type AlbumParams = {
  limit?: number;
  offset?: number;
  year?: string;
  genre?: string;
  language?: string;
  artist?: string;
  albName?: string;
  streamCount?: number;
};

export const getMostStreamedSongs = async (params: SongParams) => {
  const { limit, offset, year, genre, language, artist, name, streamCount } =
    params;
  console.log("Fetching most streamed songs");
  const songs = await prisma.mostStreamedSongs.findMany({
    where: {
      AND: [
        year
          ? {
              year: {
                equals: year,
              },
            }
          : {},
        genre ? { genre: { in: genre } } : {},
        language ? { language: { in: language } } : {},
        artist ? { artist: { contains: artist } } : {},
        name ? { name: { contains: name } } : {},
        streamCount ? { streamCount: { gte: streamCount } } : {},
      ],
    },
    take: limit,
    skip: offset,
    orderBy: {
      streamCount: "desc",
    },
  });

  // Optionally trigger background Spotify data updates for songs without spotifyId
  // This runs asynchronously and doesn't block the response
  const songsWithoutSpotify = songs.filter(song => !song.spotifyId && song.name && song.artist);
  if (songsWithoutSpotify.length > 0) {
    // Limit background updates to avoid overloading Spotify API
    const { updateSongsSpotifyDataBackground } = await import("@/lib/utils/spotify-song-updater");
    updateSongsSpotifyDataBackground(songsWithoutSpotify.slice(0, 5).map(song => song.id));
  }

  return songs;
};

export const getMostStreamedAlbums = async (params: AlbumParams) => {
  const { limit, offset, year, genre, language, artist, albName, streamCount } =
    params;
  console.log("Fetching most streamed albums");
  const albums = await prisma.mostStreamedAlbums.findMany({
    where: {
      AND: [
        year
          ? {
              year: {
                equals: year,
              },
            }
          : {},
        genre ? { genre: { contains: genre, mode: 'insensitive' } } : {},
        language ? { language: { contains: language, mode: 'insensitive' } } : {},
        artist ? { artist: { contains: artist, mode: 'insensitive' } } : {},
        albName ? { albName: { contains: albName, mode: 'insensitive' } } : {},
        streamCount ? { streamCount: { gte: streamCount } } : {},
      ],
    },
    take: limit,
    skip: offset,
    orderBy: {
      streamCount: "desc",
    },
  });

  return albums;
};

export const getAlbumFilterOptions = async () => {
  console.log("Fetching album filter options");
  
  // Get unique years
  const yearsResult = await prisma.mostStreamedAlbums.findMany({
    select: { year: true },
    distinct: ['year'],
    where: { year: { not: null } },
    orderBy: { year: 'desc' },
  });
  
  // Get unique genres
  const genresResult = await prisma.mostStreamedAlbums.findMany({
    select: { genre: true },
    distinct: ['genre'],
    where: { genre: { not: null } },
    orderBy: { genre: 'asc' },
  });
  
  // Get unique languages
  const languagesResult = await prisma.mostStreamedAlbums.findMany({
    select: { language: true },
    distinct: ['language'],
    where: { language: { not: null } },
    orderBy: { language: 'asc' },
  });
  
  // Get top artists
  const artistsResult = await prisma.mostStreamedAlbums.findMany({
    select: { artist: true },
    distinct: ['artist'],
    where: { artist: { not: null } },
    orderBy: { streamCount: 'desc' },
    take: 100, // Limit to top 100 artists
  });

  return {
    years: yearsResult.map(item => item.year).filter((year): year is string => Boolean(year)),
    genres: genresResult.map(item => item.genre).filter((genre): genre is string => Boolean(genre)),
    languages: languagesResult.map(item => item.language).filter((language): language is string => Boolean(language)),
    artists: artistsResult.map(item => item.artist).filter((artist): artist is string => Boolean(artist)),
  };
};
