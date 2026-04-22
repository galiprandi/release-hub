/**
 * Centralized configuration for Seki API queries
 */
export const SEKI_CONFIG = {
  /**
   * Refetch interval in milliseconds (1 minute)
   * How often to automatically refetch data from Seki API
   */
  refetchInterval: 30000,
} as const
