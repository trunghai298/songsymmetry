# Redis Integration for SongSymmetry

This document describes the Redis integration for SongSymmetry, used for song data updates and scheduled tasks.

## Overview

SongSymmetry uses Redis for:

1. **Job Queuing**: Managing and scheduling song data update tasks using Bull
2. **Background Processing**: Processing jobs within the main application process
3. **Scheduled Updates**: Automating weekly song data updates

## Architecture

The Redis integration consists of these key components:

- **Queues**: Defines and manages the job queues for song updates using Bull
- **Direct Processing**: Jobs are processed within the main application
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

### Direct Processing (`src/lib/redis/direct-processing.ts`)

- Processes jobs directly within the main application
- Handles song data updates
- Manages job progress, completion, and error reporting

### API Endpoints

- **`/api/song-updates`**: Manages song update jobs
  - `GET`: Checks service availability
  - `POST`: Schedules new update jobs

- **`/api/redis-test`**: Tests Redis connectivity
  - `GET`: Runs basic Redis operations and reports status

## Usage

### Background Processing

Job processing is handled automatically within the main application. When you start the main application, it will process any scheduled jobs from the Redis queues.

```bash
npm run dev  # or npm start for production
```

When deploying to Fly.io, make sure to set the REDIS_URL in your environment variables.

### Scheduling Updates

All job scheduling is now done through the API endpoints:

To schedule updates via API calls:

```bash
# Schedule daily updates
curl -X POST http://localhost:3000/api/song-updates -H 'Content-Type: application/json' -d '{"action":"schedule-daily"}'

# Run full update immediately  
curl -X POST http://localhost:3000/api/song-updates -H 'Content-Type: application/json' -d '{"action":"run-full-update"}'

# Update specific year
curl -X POST http://localhost:3000/api/song-updates -H 'Content-Type: application/json' -d '{"action":"update-year","year":"2025"}'
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

### Jobs Not Processing

If jobs aren't being processed:

1. Check the main application logs for any errors:
   ```bash
   npm run dev  # or check your deployment logs
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

4. Verify jobs are being scheduled by calling the API endpoints and checking the response.