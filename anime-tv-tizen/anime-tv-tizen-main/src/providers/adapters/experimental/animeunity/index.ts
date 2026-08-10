import { ExternalHtmlProvider } from '../../ExternalHtmlProvider';
import { createAnimeunityConfig } from './config';
import { createAnimeunityParsers } from './parsers';

export function createAnimeunityProvider(options?: {
  baseUrl?: string;
  enabled?: boolean;
}): ExternalHtmlProvider {
  const config = createAnimeunityConfig(options?.baseUrl);
  if (options?.enabled !== undefined) {
    config.enabled = options.enabled;
  }
  return new ExternalHtmlProvider(config, createAnimeunityParsers());
}

export { createAnimeunityParsers, createAnimeunityConfig };
export {
  enrichAnimeunityStreams,
  extractVixcloudDownloadUrl,
  parseVixcloudEmbedUrl,
  resolveVixcloudEmbed,
} from './resolveEmbed';
