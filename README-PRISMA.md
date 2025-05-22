# Prisma Setup for SongSymmetry

This document explains the Prisma setup for the SongSymmetry project.

## Database Structure

The project uses PostgreSQL as its database and Prisma ORM for database access. The schema includes the following models:

1. **MostStreamedSongs**: Stores data about most streamed songs
2. **MostStreamedAlbums**: Stores data about most streamed albums
3. **Station**: Represents a collaborative music station
4. **StationMember**: Stores membership information for stations
5. **StationTrack**: Stores tracks added to stations
6. **User**: Stores user information, including Spotify authentication details

## Schema Files

The schema is defined in:
- `/prisma/schema.prisma`

## Migrations

Database migrations are stored in:
- `/prisma/migrations/`

## Prisma Client

The Prisma client is instantiated in:
- `/src/lib/prisma.ts`

This file creates a singleton instance of the Prisma client to be used throughout the application.

## Running Migrations

To apply database migrations:

```bash
npx prisma migrate dev
```

To generate the Prisma client:

```bash
npx prisma generate
```

## Important Notes

1. Always use the shared Prisma client from `/src/lib/prisma.ts` instead of creating new instances.
2. Run migrations after making schema changes.
3. Keep the schema.prisma file in sync with your database.

## Recent Changes

- Added Station, StationMember, StationTrack, and User models
- Updated API endpoints to use the centralized Prisma client
- Created migrations for the new models