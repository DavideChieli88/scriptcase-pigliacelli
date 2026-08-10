import { ExternalHtmlProvider } from '../../ExternalHtmlProvider';
import { createAnimesaturnConfig } from './config';
import { createAnimesaturnParsers } from './parsers';

export function createAnimesaturnProvider(options?: {
  baseUrl?: string;
  enabled?: boolean;
}): ExternalHtmlProvider {
  const config = createAnimesaturnConfig(options?.baseUrl);
  if (options?.enabled !== undefined) {
    config.enabled = options.enabled;
  }
  return new ExternalHtmlProvider(config, createAnimesaturnParsers());
}

export { createAnimesaturnParsers, createAnimesaturnConfig };
