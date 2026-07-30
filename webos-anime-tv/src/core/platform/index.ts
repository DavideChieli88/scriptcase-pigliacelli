import type { AppLifecycleAdapter, DeviceCapabilities, PlatformAdapter } from './types';
import { mapRemoteKey } from './RemoteKeyMap';
import type { RemoteKey } from './types';

function createNoopLifecycle(): AppLifecycleAdapter {
  return {
    onLaunch: (handler) => {
      handler();
      return () => undefined;
    },
    onRelaunch: () => () => undefined,
    onClose: () => () => undefined,
  };
}

function baseCapabilities(platform: 'webos' | 'browser'): DeviceCapabilities {
  return {
    platform,
    hasIndexedDB: typeof indexedDB !== 'undefined',
    hasVideo: typeof HTMLVideoElement !== 'undefined',
    supportsHlsNatively: false,
    remote: true,
    screenWidth: window.innerWidth || 1920,
    screenHeight: window.innerHeight || 1080,
  };
}

export class BrowserPlatformAdapter implements PlatformAdapter {
  readonly id = 'browser';
  lifecycle = createNoopLifecycle();

  detect(): DeviceCapabilities {
    return baseCapabilities('browser');
  }

  mapKey(event: KeyboardEvent): RemoteKey {
    return mapRemoteKey(event);
  }

  exitApp(): void {
    window.close();
  }
}

declare global {
  interface Window {
    webOS?: {
      platformBack?: () => void;
      deviceInfo?: (cb: (info: unknown) => void) => void;
    };
    webOSDev?: unknown;
  }
}

export class WebOSPlatformAdapter implements PlatformAdapter {
  readonly id = 'webos';
  lifecycle = createNoopLifecycle();

  detect(): DeviceCapabilities {
    return baseCapabilities('webos');
  }

  mapKey(event: KeyboardEvent): RemoteKey {
    return mapRemoteKey(event);
  }

  exitApp(): void {
    try {
      window.webOS?.platformBack?.();
    } catch {
      // ignore
    }
  }
}

export function createPlatformAdapter(): PlatformAdapter {
  const isWebOS =
    typeof window !== 'undefined' &&
    (!!window.webOS || /Web0S|WebOS|webOS/i.test(navigator.userAgent));
  return isWebOS ? new WebOSPlatformAdapter() : new BrowserPlatformAdapter();
}
