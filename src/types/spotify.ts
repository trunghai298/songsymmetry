import { Market, MaxInt } from "@spotify/web-api-ts-sdk";

// Type aliases for Spotify API parameters
export type TimeRangeType = 'short_term' | 'medium_term' | 'long_term';

// Re-export the Market type for convenience
export type { Market };

// Helper for creating MaxInt values (up to 50)
export const MaxInt50 = {
  // Common values
  DEFAULT: 20 as MaxInt<50>,
  SMALL: 10 as MaxInt<50>,
  MEDIUM: 30 as MaxInt<50>,
  LARGE: 50 as MaxInt<50>,
  
  // Convert any valid number to MaxInt<50>
  create: (value: number): MaxInt<50> => {
    // Ensure the value is within Spotify's limits (1-50)
    const clamped = Math.max(1, Math.min(50, value));
    return clamped as MaxInt<50>;
  }
};