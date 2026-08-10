import { ExternalHtmlProvider } from '../../ExternalHtmlProvider';
import { createBetaConfig } from './config';
import { createBetaParsers } from './parsers';

export function createBetaProvider(options?: {
  baseUrl?: string;
  enabled?: boolean;
}): ExternalHtmlProvider {
  const config = createBetaConfig(options?.baseUrl);
  if (options?.enabled !== undefined) {
    config.enabled = options.enabled;
  }
  return new ExternalHtmlProvider(config, createBetaParsers());
}
