import type { AdapterConfig } from '../../types';

const DEFAULT_BASE = 'https://www.animeunity.so';

export function createAnimeunityConfig(baseUrl?: string): AdapterConfig {
  const root = (baseUrl || DEFAULT_BASE).replace(/\/$/, '');
  return {
    id: 'animeunity',
    label: 'AnimeUnity',
    baseUrl: `${root}/`,
    enabled: false,
    minIntervalMs: 500,
    timeoutMs: 15000,
    routes: {
      homePath: '/',
      searchPath: (q) => `/archivio?title=${encodeURIComponent(q)}`,
      detailsPath: (id) => `/anime/${encodeURIComponent(id)}`,
      // info_api rejects windows larger than 120 (see site app.js setupTabs).
      episodesPageSize: 120,
      episodesPath: (id, range) => {
        const numericId = id.split('-')[0];
        const start = range?.start ?? 1;
        const end = range?.end ?? 120;
        return `/info_api/${encodeURIComponent(numericId)}/1?start_range=${start}&end_range=${end}`;
      },
      // Site uses DB episode id (not number). `?episode=N` SSR always returns ep1;
      // client switches via GET /embed-url/{id} (see app.js setupHls).
      streamPath: (_animeId, epId) => `/embed-url/${encodeURIComponent(epId)}`,
    },
  };
}
