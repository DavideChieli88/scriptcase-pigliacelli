import type { AdapterConfig } from '../types';
import { createFixtureParsers } from './parsers';
import { ExternalHtmlProvider } from '../ExternalHtmlProvider';

/**
 * Template adapter — uses fixture HTML contract parsers.
 * Copy this folder when adding a new experimental provider.
 * Keep `enabled: false` unless feature-flagged registration is intentional.
 */
export const templateAdapterConfig: AdapterConfig = {
  id: 'template',
  label: 'Template Adapter',
  baseUrl: 'https://example.invalid/',
  enabled: false,
  minIntervalMs: 500,
  routes: {
    homePath: '/',
    searchPath: (q) => `/search?q=${encodeURIComponent(q)}`,
    detailsPath: (id) => `/anime/${encodeURIComponent(id)}`,
    streamPath: (animeId, epId) =>
      `/watch/${encodeURIComponent(animeId)}/${encodeURIComponent(epId)}`,
  },
};

export function createTemplateProvider(
  overrides?: Partial<AdapterConfig>,
): ExternalHtmlProvider {
  const config: AdapterConfig = { ...templateAdapterConfig, ...overrides };
  return new ExternalHtmlProvider(config, createFixtureParsers(config.id));
}

export { createFixtureParsers };
