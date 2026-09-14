import type { ContentProvider, ProviderCapabilities, ProviderContext } from '../types';
import { errResult, okResult } from '../types';
import type { AnimeDetails, AnimeSummary, Episode, HomeSection } from '../../domain/models';
import {
  parseFilmCards,
  parseFilmDetails,
  parseFilmSearchResults,
  parseMaxFilmPage,
  parseSearchTotal,
  sourcesFromVidxgoEmbed,
} from './parser';
import { isFailoverError, isRateLimited, sleep } from '../failover';

const CAPABILITIES: ProviderCapabilities = {
  home: true,
  search: true,
  details: true,
  episodes: true,
  stream: true,
  offlineCache: true,
};

/** First home paint — 1 page (~20 titles). More via "Carica altri". */
export const HOME_CATALOG_PAGES = 1;
/** Each "Carica altri" batch (site ≈ 20 films/page). */
export const CATALOG_BATCH_PAGES = 5;
/** Search pages (~30 hits each). Fallback provider covers the rest. */
export const SEARCH_MAX_PAGES = 8;
const HOST_DEAD_MS = 10 * 60 * 1000;

export interface AltadefinizioneOptions {
  id: string;
  name: string;
  baseUrl: string;
  /** Tried automatically on 403/429/network errors. */
  mirrors?: string[];
}

export interface CatalogPageResult {
  items: AnimeSummary[];
  hasMore: boolean;
  nextPage: number;
  maxPage?: number;
  loadedCount: number;
}

/**
 * Altadefinizione film provider with optional mirror failover.
 * Uses personal CORS proxy + Referer for vidxgo embeds.
 */
export class AltadefinizioneProvider implements ContentProvider {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  enabled: boolean;
  readonly capabilities = CAPABILITIES;
  readonly kind = 'movies' as const;

  private readonly hosts: string[];
  private lastGoodHost: string | undefined;
  private deadUntil = new Map<string, number>();
  /** Next catalog page to fetch (1-based). */
  private catalogNextPage = 1;
  private catalogMaxPage: number | undefined;
  private catalogSeen = new Set<string>();
  private catalogLoaded = 0;

  constructor(
    private ctx: ProviderContext,
    enabled = true,
    options: AltadefinizioneOptions = {
      id: 'altadefinizione',
      name: 'Altadefinizione',
      baseUrl: 'https://altadefinizionex.co',
      mirrors: [],
    },
  ) {
    this.enabled = enabled;
    this.id = options.id;
    this.name = options.name;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    const mirrors = (options.mirrors ?? []).map((h) => h.replace(/\/$/, ''));
    this.hosts = [...new Set([this.baseUrl, ...mirrors])];
  }

  /** Whether more catalog pages can be loaded via loadMoreCatalog(). */
  hasMoreCatalog(): boolean {
    if (this.catalogNextPage <= 0) return false;
    if (this.catalogMaxPage != null) return this.catalogNextPage <= this.catalogMaxPage;
    return true;
  }

  getCatalogLoadedCount(): number {
    return this.catalogLoaded;
  }

  getCatalogMaxPage(): number | undefined {
    return this.catalogMaxPage;
  }

  getCatalogNextPage(): number {
    return this.catalogNextPage;
  }

  private filmPath(page: number): string {
    return page <= 1 ? '/film/?tipo=1' : `/film/page/${page}/?tipo=1`;
  }

  private async fetchCatalogPages(
    fromPage: number,
    pageCount: number,
  ): Promise<{ items: AnimeSummary[]; lastHtml?: string }> {
    const items: AnimeSummary[] = [];
    let lastHtml: string | undefined;
    const end = fromPage + pageCount - 1;

    for (let page = fromPage; page <= end; page++) {
      try {
        const { html, host } = await this.fetchHtml(this.filmPath(page));
        lastHtml = html;
        if (this.catalogMaxPage == null) {
          const max = parseMaxFilmPage(html);
          if (max) this.catalogMaxPage = max;
        }
        for (const item of parseFilmCards(html, host, 60)) {
          if (this.catalogSeen.has(item.id)) continue;
          this.catalogSeen.add(item.id);
          items.push({ ...item, providerId: this.id });
        }
        if (page < end) await sleep(200);
      } catch (e) {
        this.ctx.logger.warn('Altadefinizione catalog page failed', { page, e });
        if (isRateLimited(e)) {
          await sleep(2500);
          break;
        }
      }
    }
    return { items, lastHtml };
  }

  /**
   * Load next batch of catalog pages (progressive — site has 1000+ pages).
   * Call after getHome(); use until hasMore is false.
   */
  async loadMoreCatalog(): Promise<ReturnType<typeof okResult<CatalogPageResult>>> {
    try {
      if (this.catalogMaxPage != null && this.catalogNextPage > this.catalogMaxPage) {
        return okResult(this.id, {
          items: [],
          hasMore: false,
          nextPage: this.catalogNextPage,
          maxPage: this.catalogMaxPage,
          loadedCount: this.catalogLoaded,
        });
      }

      const from = this.catalogNextPage;
      const { items } = await this.fetchCatalogPages(from, CATALOG_BATCH_PAGES);
      this.catalogNextPage = from + CATALOG_BATCH_PAGES;
      this.catalogLoaded += items.length;

      const hasMore =
        items.length > 0 &&
        (this.catalogMaxPage == null || this.catalogNextPage <= this.catalogMaxPage);

      if (items.length === 0) {
        // No new titles — stop to avoid endless empty scans.
        this.catalogMaxPage = Math.min(this.catalogMaxPage ?? from, from - 1);
      }

      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, {
        items,
        hasMore,
        nextPage: this.catalogNextPage,
        maxPage: this.catalogMaxPage,
        loadedCount: this.catalogLoaded,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      return errResult(this.id, isRateLimited(e) ? 'RATE_LIMITED' : 'NETWORK_ERROR', message, true);
    }
  }

  private isDnsSinkholeError(message: string): boolean {
    return /ECONNREFUSED\s+127\.|ECONNREFUSED 127\.|::1|sinkhole/i.test(message);
  }

  private orderedHosts(): string[] {
    const now = Date.now();
    const live = this.hosts.filter((h) => (this.deadUntil.get(h) ?? 0) < now);
    const list = live.length ? live : [...this.hosts];
    if (this.lastGoodHost && list.includes(this.lastGoodHost)) {
      return [this.lastGoodHost, ...list.filter((h) => h !== this.lastGoodHost)];
    }
    return list;
  }

  private markHostDead(host: string): void {
    this.deadUntil.set(host, Date.now() + HOST_DEAD_MS);
    if (this.lastGoodHost === host) this.lastGoodHost = undefined;
  }

  private async fetchHtml(pathOrUrl: string): Promise<{ html: string; host: string }> {
    if (pathOrUrl.startsWith('http')) {
      const html = await this.fetchOne(pathOrUrl);
      return { html, host: new URL(pathOrUrl).origin };
    }

    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    const errors: string[] = [];
    const hosts = this.orderedHosts();

    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i]!;
      const url = `${host}${path}`;
      try {
        const html = await this.fetchOne(url);
        this.lastGoodHost = host;
        return { html, host };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${host}: ${message}`);
        this.ctx.logger.warn('Altadefinizione host failed', { host, message });
        if (this.isDnsSinkholeError(message) || /Timeout rete|Timeout:/i.test(message)) {
          this.markHostDead(host);
          continue;
        }
        if (!isFailoverError(e)) throw e;
        this.markHostDead(host);
        if (isRateLimited(e) && i < hosts.length - 1) {
          await sleep(2000);
        }
      }
    }

    throw new Error(errors.join(' · ') || 'Tutti i mirror Altadefinizione falliti');
  }

  private async fetchOne(url: string): Promise<string> {
    const cacheKey = `ad:html:${url}`;
    const cached = await this.ctx.cache.getFresh(cacheKey);
    if (cached) return cached.value;
    const html = await this.ctx.http.getText(url);
    await this.ctx.cache.set({
      key: cacheKey,
      kind: 'html',
      value: html,
      ttlMs: this.ctx.cacheTtlMs,
    });
    return html;
  }

  async getHome() {
    try {
      // Reset progressive catalog cursor — full archive is 1000+ pages; load in batches.
      this.catalogSeen = new Set();
      this.catalogNextPage = 1;
      this.catalogMaxPage = undefined;
      this.catalogLoaded = 0;

      const { items } = await this.fetchCatalogPages(1, HOME_CATALOG_PAGES);
      this.catalogNextPage = 1 + HOME_CATALOG_PAGES;
      this.catalogLoaded = items.length;

      const sections: HomeSection[] = [];
      if (items.length) {
        sections.push({ id: 'ad-films', title: 'Ultimi film', items: items.slice(0, 24) });
        if (items.length > 24) {
          sections.push({ id: 'ad-catalog', title: 'Catalogo film', items: items.slice(24) });
        }
      }
      if (!sections.length) {
        return errResult(this.id, 'PARSE_ERROR', 'Catalogo Altadefinizione vuoto', true);
      }
      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, sections);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      this.ctx.logger.warn('Altadefinizione getHome failed', e);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }

  async search(query: string) {
    try {
      const q = query.trim();
      if (!q) return okResult(this.id, []);

      // Paginate until Found N is covered (DLE ~30/page). Soft cap keeps search snappy.
      const HARD_MAX_PAGES = SEARCH_MAX_PAGES;
      const seen = new Set<string>();
      const items: AnimeSummary[] = [];
      let total: number | undefined;

      for (let page = 1; page <= HARD_MAX_PAGES; page++) {
        const path =
          page === 1
            ? `/?do=search&subaction=search&story=${encodeURIComponent(q)}`
            : `/?do=search&subaction=search&story=${encodeURIComponent(q)}&search_start=${page}`;
        const { html, host } = await this.fetchHtml(path);
        if (total == null) total = parseSearchTotal(html);

        const batch = parseFilmSearchResults(html, host, 40);
        let added = 0;
        for (const item of batch) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          items.push({ ...item, providerId: this.id });
          added++;
        }

        if (added === 0 && page > 1) break;
        if (total != null && page * 30 >= total) break;
        if (page > 1 && batch.length < 5) break;
        if (page < HARD_MAX_PAGES) await sleep(250);
      }

      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, items);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      return errResult(this.id, isRateLimited(e) ? 'RATE_LIMITED' : 'NETWORK_ERROR', message, true);
    }
  }

  /** Detail pages may be `…-streaming.html` or plain `….html`. */
  private detailPathsForId(animeId: string): string[] {
    if (animeId.startsWith('http')) return [animeId];
    const base = animeId.replace(/^\/+/, '').replace(/-streaming\.html$/i, '').replace(/\.html$/i, '');
    return [`/${base}-streaming.html`, `/${base}.html`];
  }

  private async fetchDetailsHtml(animeId: string): Promise<{ html: string; host: string; path: string }> {
    const errors: string[] = [];
    for (const path of this.detailPathsForId(animeId)) {
      try {
        const page = await this.fetchHtml(path);
        return { ...page, path };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${path}: ${message}`);
        if (!isFailoverError(e) && !/HTTP 404/i.test(message)) throw e;
      }
    }
    throw new Error(errors.join(' · ') || 'Dettaglio film non trovato');
  }

  async getAnimeDetails(animeId: string) {
    try {
      const { html, host } = await this.fetchDetailsHtml(animeId);
      const meta = parseFilmDetails(html, host, animeId);
      const episode: Episode = {
        id: animeId,
        animeId,
        providerId: this.id,
        number: 1,
        title: 'Film',
        streamAvailable: !!meta.embedUrl,
      };
      const details: AnimeDetails = {
        id: animeId,
        providerId: this.id,
        title: meta.title,
        slug: animeId,
        coverUrl: meta.coverUrl,
        description: meta.description,
        year: meta.year,
        genres: meta.genres,
        status: 'unknown',
        episodes: [episode],
      };
      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, details);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }

  async getEpisodes(animeId: string) {
    const details = await this.getAnimeDetails(animeId);
    if (!details.ok || !details.data) {
      return errResult(
        this.id,
        details.error?.code ?? 'UNAVAILABLE',
        details.error?.message ?? 'Film non disponibile',
      );
    }
    return okResult(this.id, details.data.episodes);
  }

  async getStreamSources(episodeId: string) {
    try {
      // Film IDs are site-specific: do not retry the same path on mirrors (404).
      const { html: pageHtml, host, path } = await this.fetchDetailsHtml(episodeId);
      const pageUrl = path.startsWith('http') ? path : `${host}${path}`;
      const meta = parseFilmDetails(pageHtml, host, episodeId);
      if (!meta.imdbDigits && !meta.embedUrl) {
        return errResult(this.id, 'PARSE_ERROR', 'Player film non trovato nella pagina', true);
      }

      const imdb = meta.imdbDigits || meta.embedUrl?.match(/\/(\d+)(?:\?|$)/)?.[1];
      if (!imdb) {
        return errResult(this.id, 'PARSE_ERROR', 'IMDB id mancante per Vidxgo', true);
      }

      const embedReferer = meta.embedUrl || `https://v.vidxgo.co/${imdb}`;
      const proxyRoot = this.ctx.http.getProxyBaseUrl()?.replace(/\/$/, '');

      // Prefer direct Vidxgo token (webOS allowCrossDomain) — no PC proxy needed.
      let signedUrl: string | undefined;
      let resolveError: string | undefined;
      try {
        signedUrl = await this.resolveVidxgoDirect(imdb, pageUrl);
      } catch (e) {
        resolveError = e instanceof Error ? e.message : String(e);
        this.ctx.logger.warn('Vidxgo direct resolve failed', e);
      }

      // Fallback: Node helper on LAN proxy (sets Referer/cookies reliably).
      if (!signedUrl && proxyRoot) {
        try {
          const api = `${proxyRoot}/vidxgo/playlist?imdb=${encodeURIComponent(imdb)}&referer=${encodeURIComponent(pageUrl)}`;
          const resolved = await this.ctx.http.getJson<{
            ok?: boolean;
            url?: string;
            embedUrl?: string;
            error?: string;
          }>(api, { timeoutMs: 30000 }, false);
          if (resolved.url) signedUrl = resolved.url;
          else resolveError = resolved.error || resolveError;
        } catch (e) {
          resolveError = e instanceof Error ? e.message : String(e);
        }
      }

      if (signedUrl) {
        const playUrl = proxyRoot
          ? `${proxyRoot}/fetch?url=${encodeURIComponent(signedUrl)}&referer=${encodeURIComponent(embedReferer)}`
          : signedUrl;
        await this.ctx.providerState.recordSuccess(this.id);
        return okResult(this.id, [
          {
            url: playUrl,
            type: 'hls' as const,
            quality: 'default',
            label: 'Altadefinizione HLS',
          },
        ]);
      }

      // Fallback: scrape embed HTML currentSrc.
      if (meta.embedUrl) {
        const embedHtml = await this.ctx.http.getText(meta.embedUrl, {
          headers: { 'X-Proxy-Referer': pageUrl },
          timeoutMs: 28000,
        });
        const sources = sourcesFromVidxgoEmbed(embedHtml).map((s) =>
          s.type === 'hls' && proxyRoot
            ? {
                ...s,
                url: `${proxyRoot}/fetch?url=${encodeURIComponent(s.url)}&referer=${encodeURIComponent(embedReferer)}`,
              }
            : s,
        );
        if (sources.length) {
          await this.ctx.providerState.recordSuccess(this.id);
          return okResult(this.id, sources);
        }
      }

      return errResult(
        this.id,
        'PARSE_ERROR',
        resolveError || 'Playlist Vidxgo non disponibile',
        true,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      this.ctx.logger.warn('Altadefinizione getStreamSources failed', e);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }

  /** Client-side embed → /t/{imdb} (works when webOS skips CORS). */
  private async resolveVidxgoDirect(imdb: string, pageReferer: string): Promise<string> {
    const id = imdb.replace(/^tt/i, '');
    const embedUrl = `https://v.vidxgo.co/${id}`;
    await this.ctx.http.getText(
      embedUrl,
      { headers: { 'X-Proxy-Referer': pageReferer }, timeoutMs: 20000 },
      'auto',
    );
    const token = await this.ctx.http.getJson<{ url?: string }>(
      `https://v.vidxgo.co/t/${encodeURIComponent(id)}`,
      { timeoutMs: 20000 },
      'auto',
    );
    if (!token?.url) throw new Error('Vidxgo token senza url');
    return String(token.url).replace(/\\\//g, '/');
  }
}
