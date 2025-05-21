"use server";
import { prisma } from "../../lib/prisma";

type Params = {
  limit?: number;
  offset?: number;
  year?: string;
  genre?: string[];
  language?: string[];
  artist?: string;
  name?: string;
  streamCount?: number;
};

export const getMostStreamedSongs = async (params: Params) => {
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

  return songs;
};
