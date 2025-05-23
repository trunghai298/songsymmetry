import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all distinct years, languages, and genres from the database
    const [years, languages, genres] = await Promise.all([
      prisma.mostStreamedSongs.findMany({
        select: { year: true },
        distinct: ['year'],
        where: {
          year: {
            not: null,
          },
        },
        orderBy: {
          year: 'desc',
        },
      }),
      prisma.mostStreamedSongs.findMany({
        select: { language: true },
        distinct: ['language'],
        where: {
          language: {
            not: null,
          },
        },
        orderBy: {
          language: 'asc',
        },
      }),
      prisma.mostStreamedSongs.findMany({
        select: { genre: true },
        distinct: ['genre'],
        where: {
          genre: {
            not: null,
          },
        },
        orderBy: {
          genre: 'asc',
        },
      }),
    ]);

    // Extract unique values and filter out null/empty values
    const uniqueYears = years
      .map(item => item.year)
      .filter(year => year && year.trim() !== '')
      .sort((a, b) => parseInt(b!) - parseInt(a!)); // Sort descending

    const uniqueLanguages = languages
      .map(item => item.language)
      .filter(lang => lang && lang.trim() !== '' && lang !== 'Unknown')
      .sort();

    const uniqueGenres = genres
      .map(item => item.genre)
      .filter(genre => genre && genre.trim() !== '' && genre !== 'Unknown')
      .sort();

    return NextResponse.json({
      years: uniqueYears,
      languages: uniqueLanguages,
      genres: uniqueGenres,
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}