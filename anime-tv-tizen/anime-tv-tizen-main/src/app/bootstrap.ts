import { openDatabase } from '@/persistence/db';
import { settingsService } from '@/services/SettingsService';
import { providerRegistry } from '@/providers/registry';
import { mockAltProvider, mockProvider } from '@/providers/mock/MockProvider';
import { createExperimentalProviders } from '@/providers/adapters/registerExperimental';
import { isDebugEnv, isExternalAdaptersEnabled } from '@/app/config';
import { setLogLevel, logger } from '@/utils/logger';
import { debugLog } from '@/utils/debugLog';

export async function bootstrap(): Promise<void> {
  if (isDebugEnv()) {
    setLogLevel('debug');
    debugLog.setEnabled(true);
  }

  await openDatabase();
  await settingsService.load();

  providerRegistry.register(mockProvider);
  providerRegistry.register(mockAltProvider);

  if (isExternalAdaptersEnabled()) {
    const experimental = createExperimentalProviders();
    for (const provider of experimental) {
      providerRegistry.register(provider);
      if (provider.enabled) {
        logger.warn(
          'Bootstrap',
          `Experimental provider ENABLED: ${provider.id} — ensure legal/personal use only`,
        );
      } else {
        logger.info('Bootstrap', `Registered disabled experimental provider: ${provider.id}`);
      }
    }
  } else {
    logger.info('Bootstrap', 'External adapters flag OFF — experimental providers not registered');
  }

  await settingsService.ensurePreferredProvider();

  logger.info('Bootstrap', 'Ready', {
    providers: providerRegistry.listRefs(false),
    preferredProviderId: settingsService.get().preferredProviderId,
  });
}
