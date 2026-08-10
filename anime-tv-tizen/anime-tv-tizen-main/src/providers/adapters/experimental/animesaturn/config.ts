import type { AdapterConfig } from '../../types';

const DEFAULT_BASE = 'https://www.animesaturn.net';

export function createAnimesaturnConfig(baseUrl?: string): AdapterConfig {
  // Dev: same-origin Vite proxy avoids CORS for catalog + playlist
  const root = (
    baseUrl ||
    (import.meta.env.DEV ? '/__as' : DEFAULT_BASE)
  ).replace(/\/$/, '');
  return {
    id: 'animesaturn',
    label: 'AnimeSaturn',
    baseUrl: `${root}/`,
    enabled: false,
    minIntervalMs: 500,
    timeoutMs: 15000,
    routes: {
      homePath: '/',
      searchPath: (q) => `/filter?key=${encodeURIComponent(q)}`,
      detailsPath: (id) => `/anime/${encodeURIComponent(id)}`,
      // Watch page (contains #watch-iframe embed), not /episode/ landing
      streamPath: (animeId, epId) => {
        const ep = epId.startsWith('ep') ? epId : `ep-${epId}`;
        return `/anime/${encodeURIComponent(animeId)}/${encodeURIComponent(ep)}`;
      },
    },
  };
}
