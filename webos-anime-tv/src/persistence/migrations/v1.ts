/** Schema v1 — stores created in openDatabase onupgradeneeded. */
export const MIGRATION_V1 = {
  version: 1,
  stores: [
    'settings',
    'history',
    'progress',
    'watchlist',
    'cache',
    'providerState',
    'lastSeen',
  ] as const,
};
