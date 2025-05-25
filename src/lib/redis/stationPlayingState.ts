import Redis from "ioredis";

// Redis client for station playing state
let redis: Redis | null = null;
let subscriber: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set");
    }

    redis = new Redis(redisUrl);

    redis.on("error", (err) => {
      // Only log significant errors, not connection resets
      if (
        !err.message.includes("ECONNRESET") &&
        !err.message.includes("ETIMEDOUT")
      ) {
        console.error("Redis connection error:", err);
      }
    });

    // Simplified logging - only log significant events
    redis.on("ready", () => {
      console.log("🚀 Redis ready for station playing state");
    });
  }

  return redis;
}

function getSubscriberClient(): Redis {
  if (!subscriber) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set");
    }

    subscriber = new Redis(redisUrl);

    subscriber.on("error", (err) => {
      // Only log significant errors, not connection resets
      if (
        !err.message.includes("ECONNRESET") &&
        !err.message.includes("ETIMEDOUT")
      ) {
        console.error("Redis subscriber connection error:", err);
      }
    });

    // Simplified logging - only log significant events
    subscriber.on("ready", () => {
      console.log("🚀 Redis subscriber ready for station playing state");
    });
  }

  return subscriber;
}

export interface StationPlayingState {
  isPlaying: boolean;
  currentTrackId: string | null;
  currentSpotifyId: string | null;
  trackName: string | null;
  trackArtist: string | null;
  trackImageUrl: string | null;
  playingUserId: string;
  playingUserName: string | null;
  startedAt: number; // timestamp
  lastUpdated: number; // timestamp
}

export class StationPlayingStateService {
  private redis: Redis;

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Update station playing state in Redis with retry logic
   */
  async updateStationPlayingState(
    stationId: string,
    state: StationPlayingState
  ): Promise<void> {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const key = `station:${stationId}:playing`;
        const data = {
          ...state,
          lastUpdated: Date.now(),
        };

        // Store in Redis with 24-hour expiration
        await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(data));

        // Publish to pub/sub channel for real-time updates
        const channel = `station:${stationId}:playing:changed`;
        await this.redis.publish(channel, JSON.stringify(data));

        console.log(`✅ Updated playing state for station ${stationId}:`, {
          isPlaying: state.isPlaying,
          track: state.trackName,
          user: state.playingUserName,
        });
        return; // Success, exit retry loop
      } catch (error: any) {
        retries++;
        if (retries >= maxRetries) {
          console.error(
            `Failed to update station ${stationId} playing state after ${maxRetries} retries:`,
            error
          );
          throw error;
        }

        // Only retry on connection errors
        if (
          error.message?.includes("ECONNRESET") ||
          error.message?.includes("ETIMEDOUT")
        ) {
          console.log(
            `Retrying Redis operation for station ${stationId} (${retries}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, 100 * retries)); // Exponential backoff
        } else {
          throw error; // Don't retry on other errors
        }
      }
    }
  }

  /**
   * Get current station playing state from Redis
   */
  async getStationPlayingState(
    stationId: string
  ): Promise<StationPlayingState | null> {
    try {
      const key = `station:${stationId}:playing`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as StationPlayingState;
    } catch (error) {
      console.error(`Error getting station ${stationId} playing state:`, error);
      return null;
    }
  }

  /**
   * Clear station playing state (when stopped)
   */
  async clearStationPlayingState(
    stationId: string,
    userId: string,
    userName: string | null
  ): Promise<void> {
    try {
      const state: StationPlayingState = {
        isPlaying: false,
        currentTrackId: null,
        currentSpotifyId: null,
        trackName: null,
        trackArtist: null,
        trackImageUrl: null,
        playingUserId: userId,
        playingUserName: userName,
        startedAt: Date.now(),
        lastUpdated: Date.now(),
      };

      await this.updateStationPlayingState(stationId, state);
    } catch (error) {
      console.error(
        `Error clearing station ${stationId} playing state:`,
        error
      );
      throw error;
    }
  }

  /**
   * Subscribe to station playing state changes
   */
  async subscribeToStationChanges(
    stationId: string,
    callback: (state: StationPlayingState) => void
  ): Promise<Redis> {
    const subscriberClient = getSubscriberClient();
    const channel = `station:${stationId}:playing:changed`;

    await subscriberClient.subscribe(channel);

    subscriberClient.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const state = JSON.parse(message) as StationPlayingState;
          callback(state);
        } catch (error) {
          console.error("Error parsing station playing state message:", error);
        }
      }
    });

    console.log(`📡 Subscribed to station ${stationId} playing state changes`);
    return subscriberClient;
  }

  /**
   * Get all active stations (those with recent playing activity)
   */
  async getActiveStations(): Promise<string[]> {
    try {
      const pattern = "station:*:playing";
      const keys = await this.redis.keys(pattern);

      // Extract station IDs from keys
      const stationIds = keys
        .map((key) => {
          const match = key.match(/^station:([^:]+):playing$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      return stationIds;
    } catch (error) {
      console.error("Error getting active stations:", error);
      return [];
    }
  }

  /**
   * Get playing states for multiple stations efficiently
   */
  async getMultipleStationPlayingStates(
    stationIds: string[]
  ): Promise<Map<string, StationPlayingState>> {
    try {
      if (stationIds.length === 0) {
        return new Map();
      }

      // Build Redis keys for all stations
      const keys = stationIds.map((id) => `station:${id}:playing`);

      // Get all values in one batch operation
      const values = await this.redis.mget(...keys);

      const result = new Map<string, StationPlayingState>();

      for (let i = 0; i < stationIds.length; i++) {
        const data = values[i];
        if (data) {
          try {
            const state = JSON.parse(data) as StationPlayingState;
            result.set(stationIds[i], state);
          } catch (parseError) {
            console.error(
              `Error parsing playing state for station ${stationIds[i]}:`,
              parseError
            );
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Error getting multiple station playing states:", error);
      return new Map();
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error("Redis health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const stationPlayingStateService = new StationPlayingStateService();
