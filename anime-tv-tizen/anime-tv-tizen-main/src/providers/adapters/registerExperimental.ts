import type { ContentProvider } from '@/providers/types';
import { logger } from '@/utils/logger';
import { envFlag } from '@/app/config';
import { createAlphaProvider } from './experimental/alpha';
import { createBetaProvider } from './experimental/beta';
import { createAnimesaturnProvider } from './experimental/animesaturn';
import { createAnimeunityProvider } from './experimental/animeunity';

/**
 * Build experimental external adapters for optional registration.
 * They stay disabled unless both the global flag and per-adapter enable are set.
 */
export function createExperimentalProviders(): ContentProvider[] {
  const enableAlpha = envFlag('VITE_ADAPTER_ALPHA_ENABLED', false);
  const enableBeta = envFlag('VITE_ADAPTER_BETA_ENABLED', false);
  const enableAnimesaturn = envFlag('VITE_ADAPTER_ANIMESATURN_ENABLED', false);
  const enableAnimeunity = envFlag('VITE_ADAPTER_ANIMEUNITY_ENABLED', false);
  const env = import.meta.env as ImportMetaEnv;

  const providers: ContentProvider[] = [
    createAlphaProvider({
      baseUrl: env.VITE_ADAPTER_ALPHA_BASE_URL,
      enabled: enableAlpha,
    }),
    createBetaProvider({
      baseUrl: env.VITE_ADAPTER_BETA_BASE_URL,
      enabled: enableBeta,
    }),
    createAnimesaturnProvider({
      baseUrl: env.VITE_ADAPTER_ANIMESATURN_BASE_URL,
      enabled: enableAnimesaturn,
    }),
    createAnimeunityProvider({
      baseUrl: env.VITE_ADAPTER_ANIMEUNITY_BASE_URL || 'https://www.animeunity.so',
      enabled: enableAnimeunity,
    }),
  ];

  logger.info('Adapters', 'Experimental providers created', {
    alphaEnabled: enableAlpha,
    betaEnabled: enableBeta,
    animesaturnEnabled: enableAnimesaturn,
    animeunityEnabled: enableAnimeunity,
  });

  return providers;
}
