import type { AdapterConfig } from '../../types';

/**
 * Experimental adapter shell B.
 * Same rules as alpha: parsers stubbed, enabled=false by default.
 */
export function createBetaConfig(baseUrl?: string): AdapterConfig {
  const root = (baseUrl || '').replace(/\/$/, '') || 'https://example.invalid';
  return {
    id: 'ext-beta',
    label: 'Experimental B',
    baseUrl: `${root}/`,
    enabled: false,
    minIntervalMs: 600,
    routes: {
      homePath: '/home',
      searchPath: (q) => `/search/${encodeURIComponent(q)}`,
      detailsPath: (id) => `/title/${encodeURIComponent(id)}`,
      streamPath: (animeId, epId) =>
        `/play/${encodeURIComponent(animeId)}/${encodeURIComponent(epId)}`,
    },
  };
}
