import { debugLog } from '@/utils/debugLog';
import { ProviderError } from '@/domain/errors';
import { settingsService } from '@/services/SettingsService';

declare global {
  interface Window {
    tizen?: {
      application?: {
        getCurrentApplication: () => { exit: () => void };
      };
      download?: {
        start: (
          request: unknown,
          callbacks: {
            onprogress?: (id: string, received: number, total: number) => void;
            onpaused?: (id: string) => void;
            oncanceled?: (id: string) => void;
            oncompleted?: (id: string, fullPath: string) => void;
            onfailed?: (id: string, error: { message?: string }) => void;
          },
        ) => string;
      };
      filesystem?: {
        resolve: (
          path: string,
          success: (file: TizenFileHandle) => void,
          error: (err: { message?: string }) => void,
          mode?: string,
        ) => void;
      };
      systeminfo?: {
        getCapability?: (key: string) => boolean;
        getPropertyValue?: (
          property: string,
          successCallback: (info: { networkType?: string }) => void,
          errorCallback?: (err: { message?: string }) => void,
        ) => void;
      };
      DownloadRequest?: new (
        url: string,
        destination?: string,
        fileName?: string,
        networkType?: string | null,
        httpHeader?: Record<string, string> | null,
      ) => TizenDownloadRequest;
    };
  }
}

interface TizenDownloadRequest {
  url: string;
  destination?: string | null;
  fileName?: string | null;
  networkType?: string | null;
  httpHeader?: Record<string, string> | null;
  /** Samsung-specific: disable TLS host verify when CDN certs fail native download. */
  verifyHost?: boolean;
}

interface TizenFileHandle {
  fileSize: number;
  openStream: (
    mode: string,
    success: (stream: { read: (n: number) => string; close: () => void }) => void,
    error: (err: { message?: string }) => void,
    encoding?: string,
  ) => void;
}

type NetKind = 'WIFI' | 'ETHERNET' | 'OTHER';

/**
 * GET that can send a real Referer.
 * Browser fetch/XHR normally strip Referer; Tizen download API can set it natively.
 */
export async function fetchTextWithReferer(
  url: string,
  referer: string,
  extraHeaders?: Record<string, string>,
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    'X-Embed-Referer': referer,
    ...extraHeaders,
  };

  // Optional build-time or runtime proxy (e.g. http://192.168.x.x:5173/__sc)
  const proxied = rewriteViaStreamProxy(url);
  if (proxied !== url) {
    debugLog.push('network', 'info', 'fetchWithReferer via stream proxy', {
      url: proxied.slice(0, 120),
    });
    return browserFetch(proxied, { ...headers, Referer: referer });
  }

  // Same-origin Vite proxy
  if (url.startsWith('/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin))) {
    debugLog.push('network', 'info', 'fetchWithReferer via same-origin proxy', {
      url: url.slice(0, 100),
    });
    return browserFetch(url, { ...headers, Referer: referer });
  }

  if (canUseTizenDownload()) {
    debugLog.push('network', 'info', 'fetchWithReferer via tizen.download', {
      url: url.slice(0, 100),
      referer: referer.slice(0, 80),
    });
    try {
      return await tizenDownloadText(url, {
        Referer: referer,
        Accept: headers.Accept || 'application/json',
      });
    } catch (err) {
      debugLog.push('network', 'warn', 'tizen.download failed', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    debugLog.push('network', 'warn', 'tizen.download unavailable', {
      hasTizen: typeof window !== 'undefined' && Boolean(window.tizen),
      hasDownload: typeof window !== 'undefined' && Boolean(window.tizen?.download),
      hasDownloadRequest: typeof window !== 'undefined' && Boolean(window.tizen?.DownloadRequest),
      hasFilesystem: typeof window !== 'undefined' && Boolean(window.tizen?.filesystem),
    });
  }

  try {
    debugLog.push('network', 'info', 'fetchWithReferer via XHR', { url: url.slice(0, 100) });
    return await xhrFetch(url, { ...headers, Referer: referer });
  } catch (err) {
    debugLog.push('network', 'warn', 'XHR with Referer failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  debugLog.push('network', 'warn', 'fetchWithReferer via browser fetch (Referer likely stripped)', {
    url: url.slice(0, 100),
  });
  return browserFetch(url, { ...headers, Referer: referer });
}

/** Rewrite https://play.saturncdn.net/... through Settings or VITE_SATURNCDN_PROXY. */
function rewriteViaStreamProxy(absoluteUrl: string): string {
  const origin = 'https://play.saturncdn.net';
  if (!absoluteUrl.startsWith(origin)) return absoluteUrl;

  let prefix =
    (import.meta.env as ImportMetaEnv & { VITE_SATURNCDN_PROXY?: string }).VITE_SATURNCDN_PROXY ||
    '';
  try {
    if (settingsService.isLoaded()) {
      const settings = settingsService.get();
      if (!settings.streamProxyEnabled) return absoluteUrl;
      const fromSettings = settings.streamProxyUrl?.trim();
      // Empty URL with proxy enabled → no rewrite (direct / tizen.download).
      prefix = fromSettings || '';
    }
  } catch {
    /* settings not ready */
  }
  prefix = prefix.replace(/\/$/, '');
  if (!prefix) return absoluteUrl;
  return absoluteUrl.replace(origin, prefix);
}

function canUseTizenDownload(): boolean {
  if (!window.tizen?.download || !window.tizen?.DownloadRequest || !window.tizen?.filesystem) {
    return false;
  }
  try {
    const cap = window.tizen.systeminfo?.getCapability?.('http://tizen.org/feature/download');
    if (cap === false) return false;
  } catch {
    /* optional */
  }
  return true;
}

function detectNetworkKind(): Promise<NetKind> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (kind: NetKind) => {
      if (done) return;
      done = true;
      resolve(kind);
    };
    const timer = setTimeout(() => finish('OTHER'), 1500);
    try {
      if (!window.tizen?.systeminfo?.getPropertyValue) {
        clearTimeout(timer);
        finish('OTHER');
        return;
      }
      window.tizen.systeminfo.getPropertyValue(
        'NETWORK',
        (info) => {
          clearTimeout(timer);
          const t = String(info?.networkType || '').toUpperCase();
          if (t === 'WIFI') finish('WIFI');
          else if (t === 'ETHERNET') finish('ETHERNET');
          else finish('OTHER');
        },
        () => {
          clearTimeout(timer);
          finish('OTHER');
        },
      );
    } catch {
      clearTimeout(timer);
      finish('OTHER');
    }
  });
}

async function browserFetch(url: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(url, { method: 'GET', headers });
  const text = await res.text();
  if (!res.ok) {
    throw new ProviderError('network', `HTTP ${res.status} for ${url}`, 'http', {
      status: res.status,
      body: text.slice(0, 200),
    });
  }
  return text;
}

function xhrFetch(url: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    for (const [key, value] of Object.entries(headers)) {
      try {
        xhr.setRequestHeader(key, value);
      } catch {
        /* forbidden header names */
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new ProviderError('network', `HTTP ${xhr.status} for ${url}`, 'http', {
          status: xhr.status,
          body: String(xhr.responseText || '').slice(0, 200),
        }));
      }
    };
    xhr.onerror = () => reject(new ProviderError('network', `XHR network error for ${url}`, 'http'));
    xhr.ontimeout = () => reject(new ProviderError('timeout', `XHR timeout for ${url}`, 'http'));
    xhr.timeout = 15000;
    xhr.send();
  });
}

async function tizenDownloadText(
  url: string,
  httpHeader: Record<string, string>,
): Promise<string> {
  const tizen = window.tizen!;
  const fileName = `as-pl-${Date.now()}.json`;
  const refererHeaders = {
    Referer: httpHeader.Referer || '',
    Accept: httpHeader.Accept || 'application/json',
  };
  const net = await detectNetworkKind();
  debugLog.push('network', 'info', 'tizen network kind', { net });

  /**
   * TV on Ethernet + networkType WIFI → "Connection problem occurred".
   * TV with networkType ALL → "invalid network type".
   * So: WIFI only when actually on Wi-Fi; otherwise leave networkType unset/null.
   */
  const strategies: Array<() => TizenDownloadRequest> = [];

  const applyCommon = (req: TizenDownloadRequest, networkType: string | null) => {
    req.fileName = fileName;
    req.httpHeader = refererHeaders;
    try {
      req.verifyHost = false;
    } catch {
      /* optional */
    }
    if (networkType) {
      req.networkType = networkType;
    } else {
      // Explicit null — do NOT use string "ALL" (rejected on this TV)
      try {
        req.networkType = null;
      } catch {
        /* ignore */
      }
    }
    return req;
  };

  if (net === 'WIFI') {
    strategies.push(() => applyCommon(new tizen.DownloadRequest!(url, 'downloads'), 'WIFI'));
    strategies.push(() => applyCommon(new tizen.DownloadRequest!(url, 'wgt-private-tmp'), 'WIFI'));
    strategies.push(
      () => new tizen.DownloadRequest!(url, 'downloads', fileName, 'WIFI', refererHeaders),
    );
  }

  // Ethernet / unknown: never force WIFI
  strategies.push(() => applyCommon(new tizen.DownloadRequest!(url, 'downloads'), null));
  strategies.push(() => applyCommon(new tizen.DownloadRequest!(url, 'wgt-private-tmp'), null));
  strategies.push(() => {
    const req = new tizen.DownloadRequest!(url, 'downloads', fileName);
    req.httpHeader = refererHeaders;
    try {
      req.verifyHost = false;
    } catch {
      /* optional */
    }
    return req;
  });

  const errors: string[] = [];

  const tryNext = (index: number): Promise<string> => {
    if (index >= strategies.length) {
      return Promise.reject(
        new Error(`tizen.download exhausted strategies: ${errors.join(' | ')}`),
      );
    }

    let request: TizenDownloadRequest;
    try {
      request = strategies[index]();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`build#${index}: ${msg}`);
      debugLog.push('network', 'warn', 'tizen.DownloadRequest build failed', {
        strategy: index,
        message: msg,
      });
      return tryNext(index + 1);
    }

    debugLog.push('network', 'info', 'tizen.DownloadRequest starting', {
      strategy: index,
      net,
      destination: request.destination,
      networkType: request.networkType,
      verifyHost: request.verifyHost,
      hasReferer: Boolean(request.httpHeader?.Referer),
    });

    return startDownloadAndRead(request).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`start#${index}: ${msg}`);
      debugLog.push('network', 'warn', 'tizen.download strategy failed', {
        strategy: index,
        message: msg,
      });
      return tryNext(index + 1);
    });
  };

  return tryNext(0);
}

function startDownloadAndRead(request: TizenDownloadRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const tizen = window.tizen!;
    try {
      tizen.download!.start(request, {
        oncompleted: (_id, fullPath) => {
          tizen.filesystem!.resolve(
            fullPath,
            (file) => {
              file.openStream(
                'r',
                (stream) => {
                  try {
                    const text = stream.read(file.fileSize);
                    stream.close();
                    resolve(text);
                  } catch (err) {
                    reject(err);
                  }
                },
                (err) => reject(new Error(err.message || 'filesystem openStream failed')),
                'UTF-8',
              );
            },
            (err) => reject(new Error(err.message || 'filesystem resolve failed')),
            'r',
          );
        },
        onfailed: (_id, error) => {
          reject(new Error(error?.message || 'tizen.download onfailed'));
        },
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
