import { ExternalHtmlProvider } from '../../ExternalHtmlProvider';
import { createAlphaConfig } from './config';
import { createAlphaParsers } from './parsers';

export function createAlphaProvider(options?: {
  baseUrl?: string;
  enabled?: boolean;
}): ExternalHtmlProvider {
  const config = createAlphaConfig(options?.baseUrl);
  if (options?.enabled !== undefined) {
    config.enabled = options.enabled;
  }
  return new ExternalHtmlProvider(config, createAlphaParsers());
}
