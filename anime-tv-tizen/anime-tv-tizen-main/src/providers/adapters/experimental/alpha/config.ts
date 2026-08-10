import type { AdapterConfig } from '../../types';

/**
 * Experimental adapter shell A.
 * Fill parsers when implementing; keep enabled=false unless flag + explicit opt-in.
 * Base URL is configurable via env — never hardcode production scraping into core.
 */
export function createAlphaConfig(baseUrl?: string): AdapterConfig {
  const root = (baseUrl || '').replace(/\/$/, '') || 'https://example.invalid';
  return {
    id: 'ext-alpha',
    label: 'Experimental A',
    baseUrl: `${root}/`,
    enabled: false,
    minIntervalMs: 600,
    userAgent: undefined,
    routes: {
      homePath: '/',
      searchPath: (q) => `/search?keyword=${encodeURIComponent(q)}`,
      detailsPath: (id) => `/anime/${encodeURIComponent(id)}`,
      episodesPath: (id) => `/anime/${encodeURIComponent(id)}/episodes`,
      streamPath: (animeId, epId) =>
        `/episode/${encodeURIComponent(animeId)}/${encodeURIComponent(epId)}`,
    },
  };
}
