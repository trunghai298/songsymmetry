# Redis Integration for SongSymmetry

This document describes the Redis integration for SongSymmetry, used for song data updates and scheduled tasks.

## Overview

SongSymmetry uses Redis for:

1. **Job Queuing**: Managing and scheduling song data update tasks using Bull
2. **Background Processing**: Running a worker process that executes these tasks
3. **Scheduled Updates**: Automating weekly song data updates

## Architecture

The Redis integration consists of these key components:

- **Queues**: Defines and manages the job queues for song updates using Bull
- **Workers**: Processes that consume jobs from the queues
- **API Endpoints**: HTTP routes to interact with the job system
- **Testing Tools**: Utilities to verify Redis connectivity

## Redis Configuration

Connection to Redis is configured via environment variables:

- `REDIS_URL`: The connection string for Redis (stored in GitHub secrets)
- In development with a Redis instance: Set `REDIS_URL` to your local connection string

## Components

### Queues (`src/lib/redis/queues.ts`)

- Uses Bull for reliable job queuing
- Defines job types and parameters
- Provides scheduling functions for different update patterns:
  - Full updates
  - Year-specific updates
  - Weekly scheduled updates

### Workers (`src/lib/redis/workers.ts`)

- Consumes jobs from the queues
- Processes song data updates
- Handles job progress, completion, and error reporting

### API Endpoints

- **`/api/song-updates`**: Manages song update jobs
  - `GET`: Checks service availability
  - `POST`: Schedules new update jobs

- **`/api/redis-test`**: Tests Redis connectivity
  - `GET`: Runs basic Redis operations and reports status

## Usage

### Starting the Worker

To start the background worker process:

```bash
npm run worker:start
```

When deploying to Fly.io, make sure to set the REDIS_URL in your environment variables.

### Scheduling Updates

To schedule a weekly update:

```bash
npm run worker:schedule:weekly
```

To run a full update of all songs:

```bash
npm run worker:update:all
```

To update songs for a specific year:

```bash
npm run worker:update:year
```

### Testing Redis

To test Redis connectivity:

```bash
npm run redis:test
```

To test through the API:

```bash
npm run redis:test:api
```

## Troubleshooting

### Redis Connection Issues

If you're experiencing Redis connection problems:

1. Verify the REDIS_URL environment variable is set correctly in your environment

2. For local development, make sure a Redis instance is running:
   ```bash
   redis-cli ping
   ```

3. Test the connection:
   ```bash
   npm run redis:test
   ```

### Worker Not Processing Jobs

If the worker isn't processing jobs:

1. Check the worker logs to see any errors
   ```bash
   npm run worker:start
   ```

2. Ensure Redis is available:
   ```bash
   npm run redis:test:api
   ```

3. Check the Bull queue status through the Redis CLI:
   ```bash
   redis-cli
   > keys bull:song-updates:*
   ```