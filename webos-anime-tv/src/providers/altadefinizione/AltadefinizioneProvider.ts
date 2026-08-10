import type { ContentProvider, ProviderCapabilities, ProviderContext } from '../types';
import { errResult, okResult } from '../types';
import type { AnimeDetails, AnimeSummary, Episode, HomeSection } from '../../domain/models';
import {
  parseFilmCards,
  parseFilmDetails,
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

export interface AltadefinizioneOptions {
  id: string;
  name: string;
  baseUrl: string;
  /** Tried automatically on 403/429/network errors. */
  mirrors?: string[];
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

  constructor(
    private ctx: ProviderContext,
    enabled = true,
    options: AltadefinizioneOptions = {
      id: 'altadefinizione',
      name: 'Altadefinizione',
      baseUrl: 'https://altadefinizionex.co',
      mirrors: ['https://altadefinizionegratis.trade'],
    },
  ) {
    this.enabled = enabled;
    this.id = options.id;
    this.name = options.name;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    const mirrors = (options.mirrors ?? []).map((h) => h.replace(/\/$/, ''));
    this.hosts = [...new Set([this.baseUrl, ...mirrors])];
  }

  private async fetchHtml(pathOrUrl: string): Promise<{ html: string; host: string }> {
    if (pathOrUrl.startsWith('http')) {
      const html = await this.fetchOne(pathOrUrl);
      return { html, host: new URL(pathOrUrl).origin };
    }

    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    const errors: string[] = [];

    for (let i = 0; i < this.hosts.length; i++) {
      const host = this.hosts[i]!;
      const url = `${host}${path}`;
      try {
        const html = await this.fetchOne(url);
        return { html, host };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${host}: ${message}`);
        this.ctx.logger.warn('Altadefinizione host failed', { host, message });
        if (!isFailoverError(e)) throw e;
        if (isRateLimited(e) && i < this.hosts.length - 1) {
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
      // Site lists ~20 films/page across 1000+ pages — pull several for a usable catalog.
      const pageCount = 8;
      const seen = new Set<string>();
      const catalog: AnimeSummary[] = [];

      const paths = Array.from({ length: pageCount }, (_, i) =>
        i === 0 ? '/film/?tipo=1' : `/film/page/${i + 1}/?tipo=1`,
      );

      // Parallel batches of 2 to stay polite with rate limits.
      for (let i = 0; i < paths.length; i += 2) {
        const batch = paths.slice(i, i + 2);
        const pages = await Promise.all(
          batch.map(async (path) => {
            try {
              return await this.fetchHtml(path);
            } catch (e) {
              this.ctx.logger.warn('Altadefinizione catalog page failed', { path, e });
              return null;
            }
          }),
        );
        for (const page of pages) {
          if (!page) continue;
          for (const item of parseFilmCards(page.html, page.host, 60)) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            catalog.push({ ...item, providerId: this.id });
          }
        }
      }

      const sections: HomeSection[] = [];
      if (catalog.length) {
        sections.push({ id: 'ad-films', title: 'Ultimi film', items: catalog.slice(0, 24) });
        if (catalog.length > 24) {
          sections.push({ id: 'ad-more', title: 'Altri titoli', items: catalog.slice(24, 72) });
        }
        if (catalog.length > 72) {
          sections.push({ id: 'ad-more-2', title: 'Continua a esplorare', items: catalog.slice(72) });
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
      const { html, host } = await this.fetchHtml(
        `/?do=search&subaction=search&story=${encodeURIComponent(q)}`,
      );
      const items = parseFilmCards(html, host, 80).map((item) => ({
        ...item,
        providerId: this.id,
      }));
      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, items);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      return errResult(this.id, isRateLimited(e) ? 'RATE_LIMITED' : 'NETWORK_ERROR', message, true);
    }
  }

  async getAnimeDetails(animeId: string) {
    try {
      const detailPath = animeId.startsWith('http')
        ? animeId
        : `/${animeId.replace(/^\/+/, '').replace(/-streaming\.html$/i, '')}-streaming.html`;
      const { html, host } = await this.fetchHtml(detailPath);
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
      const detailPath = episodeId.startsWith('http')
        ? episodeId
        : `/${episodeId.replace(/^\/+/, '').replace(/-streaming\.html$/i, '')}-streaming.html`;
      const pageUrl = detailPath.startsWith('http') ? detailPath : `${this.baseUrl}${detailPath}`;
      const pageHtml = await this.ctx.http.getText(pageUrl);
      const meta = parseFilmDetails(pageHtml, this.baseUrl, episodeId);
      if (!meta.imdbDigits && !meta.embedUrl) {
        return errResult(this.id, 'PARSE_ERROR', 'Player film non trovato nella pagina', true);
      }

      const imdb = meta.imdbDigits || meta.embedUrl?.match(/\/(\d+)(?:\?|$)/)?.[1];
      if (!imdb) {
        return errResult(this.id, 'PARSE_ERROR', 'IMDB id mancante per Vidxgo', true);
      }

      const proxyRoot = (this.ctx.http.getProxyBaseUrl() || 'http://192.168.1.8:8787').replace(
        /\/$/,
        '',
      );
      const api = `${proxyRoot}/vidxgo/playlist?imdb=${encodeURIComponent(imdb)}&referer=${encodeURIComponent(pageUrl)}`;
      const resolved = await this.ctx.http.getJson<{
        ok?: boolean;
        url?: string;
        embedUrl?: string;
        error?: string;
      }>(api, { timeoutMs: 30000 }, false);

      if (resolved.url) {
        const embedReferer = resolved.embedUrl || `https://v.vidxgo.co/${imdb}`;
        // Play through CORS proxy + m3u8 rewrite (CDN blocks non-vidxgo Origin).
        const playUrl = `${proxyRoot}/fetch?url=${encodeURIComponent(resolved.url)}&referer=${encodeURIComponent(embedReferer)}`;
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

      // Fallback: scrape embed HTML currentSrc (often expired / cache-blocked).
      if (meta.embedUrl) {
        const embedHtml = await this.ctx.http.getText(meta.embedUrl, {
          headers: { 'X-Proxy-Referer': pageUrl },
          timeoutMs: 28000,
        });
        const embedReferer = meta.embedUrl;
        const sources = sourcesFromVidxgoEmbed(embedHtml).map((s) =>
          s.type === 'hls'
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
        resolved.error || 'Playlist Vidxgo non disponibile',
        true,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      this.ctx.logger.warn('Altadefinizione getStreamSources failed', e);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }
}
