export type SongFilters = {
  limit?: number;
  offset?: number;
  year?: string;
  genre?: string[];
  language?: string[];
  artist?: string;
  name?: string;
};

export type MostStreamedSong = {
  id: number; // Non-nullable in Prisma
  name: string | null; // String? => can be null
  artist: string | null;
  thumbnail: string | null;
  streamCount: bigint | null; // BigInt? => bigint | null
  dailyStreamCount: bigint | null;
  year: string | null;
  genre: string | null;
  language: string | null;
};
