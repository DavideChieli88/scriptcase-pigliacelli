import type { ContentProvider, ProviderCapabilities, ProviderContext } from '../types';
import { errResult, okResult } from '../types';
import { parseAnimeDetails } from './parser';
import {
  decodeSaturnPayload,
  playlistUrlFromEmbed,
  sourcesFromDecoded,
  toWatchApiPath,
  type SaturnPlaylist,
  type SaturnWatchApi,
} from './stream';
import type { AnimeSummary, HomeSection, StreamSource } from '../../domain/models';

const CAPABILITIES: ProviderCapabilities = {
  home: true,
  search: true,
  details: true,
  episodes: true,
  stream: true,
  offlineCache: true,
};

interface HomeEpisodeItem {
  url: string;
  title: string;
  poster?: string;
  episodeLabel?: string;
  type?: string;
}

function animeIdFromEpisodeUrl(url: string): string | undefined {
  // /episode/{slug}/ep-7 -> anime/{slug}
  const m = url.match(/\/episode\/([^/]+)\/ep-\d+/i);
  return m ? `anime/${m[1]}` : undefined;
}

export class AnimeSaturnProvider implements ContentProvider {
  readonly id = 'animesaturn';
  readonly name = 'AnimeSaturn';
  readonly baseUrl = 'https://www.animesaturn.net';
  enabled: boolean;
  readonly capabilities = CAPABILITIES;

  constructor(
    private ctx: ProviderContext,
    enabled = true,
  ) {
    this.enabled = enabled;
  }

  private async fetchHtml(pathOrUrl: string): Promise<string> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`;
    const cacheKey = `as:html:${url}`;
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
      const pages = await Promise.all([
        this.ctx.http.getJson<{ items?: HomeEpisodeItem[] }>(`${this.baseUrl}/api/home/episodes?page=1`),
        this.ctx.http.getJson<{ items?: HomeEpisodeItem[] }>(`${this.baseUrl}/api/home/episodes?page=2`).catch(() => ({ items: [] })),
      ]);

      const rows = [...(pages[0].items ?? []), ...(pages[1].items ?? [])];
      if (!rows.length) {
        return errResult(this.id, 'PARSE_ERROR', 'Home API AnimeSaturn vuota', true);
      }

      const recentEps: AnimeSummary[] = [];
      const uniqueAnime = new Map<string, AnimeSummary>();

      for (const row of rows) {
        const animeId = animeIdFromEpisodeUrl(row.url);
        if (!animeId) continue;
        const summary: AnimeSummary = {
          id: animeId,
          providerId: this.id,
          title: row.title,
          coverUrl: row.poster,
          slug: animeId,
          status: 'unknown',
          description: row.episodeLabel ? `Ep. ${row.episodeLabel}` : undefined,
        };
        recentEps.push({
          ...summary,
          title: row.episodeLabel ? `${row.title} · Ep. ${row.episodeLabel}` : row.title,
          id: animeId,
        });
        if (!uniqueAnime.has(animeId)) uniqueAnime.set(animeId, summary);
      }

      const popular = [...uniqueAnime.values()].slice(0, 18);
      const sections: HomeSection[] = [
        { id: 'recent-eps', title: 'Aggiunti di recente', items: recentEps.slice(0, 18) },
        { id: 'popular', title: 'Popolari', items: popular },
      ];

      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, sections);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      this.ctx.logger.warn('AnimeSaturn getHome failed', e);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }

  async search(query: string) {
    try {
      const q = query.trim();
      if (!q) return okResult(this.id, []);
      const apiUrl = `${this.baseUrl}/api/search?q=${encodeURIComponent(q)}`;
      const payload = await this.ctx.http.getJson<{
        query?: string;
        results?: Array<{
          title: string;
          url: string;
          poster?: string;
          year?: string | number;
          genres?: Array<{ name: string }>;
          status?: { label?: string; tone?: string };
        }>;
      }>(apiUrl);

      const items = (payload.results ?? []).map((row) => {
        const href = row.url.startsWith('http') ? row.url : `${this.baseUrl}${row.url}`;
        let id = row.url.replace(/^\//, '');
        try {
          id = new URL(href).pathname.replace(/^\//, '');
        } catch {
          // keep id
        }
        const yearNum = row.year != null ? Number(row.year) : undefined;
        const tone = row.status?.tone?.toLowerCase();
        const status =
          tone === 'finished' || /finit/i.test(row.status?.label ?? '')
            ? ('completed' as const)
            : tone === 'ongoing' || /in corso/i.test(row.status?.label ?? '')
              ? ('ongoing' as const)
              : ('unknown' as const);

        return {
          id,
          providerId: this.id,
          title: row.title,
          slug: id,
          coverUrl: row.poster,
          year: Number.isFinite(yearNum) ? yearNum : undefined,
          genres: row.genres?.map((g) => g.name).filter(Boolean),
          status,
        };
      });

      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, items);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }

  async getAnimeDetails(animeId: string) {
    try {
      const path = animeId.startsWith('http') ? animeId : `/${animeId}`;
      const html = await this.fetchHtml(path);
      const details = parseAnimeDetails(html, this.baseUrl, animeId);
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
        details.error?.message ?? 'Episodi non disponibili',
      );
    }
    return okResult(this.id, details.data.episodes);
  }

  async getStreamSources(episodeId: string) {
    try {
      const sources = await this.resolveStreams(episodeId);
      if (!sources.length) {
        return errResult(this.id, 'PARSE_ERROR', 'Nessuna sorgente stream decodificata', true);
      }
      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, sources);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      this.ctx.logger.warn('AnimeSaturn getStreamSources failed', e);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }

  private async resolveStreams(episodeId: string): Promise<StreamSource[]> {
    const apiUrl = toWatchApiPath(episodeId, this.baseUrl);
    const watch = await this.ctx.http.getJson<SaturnWatchApi>(apiUrl);
    if (!watch.ok) {
      throw new Error(watch.error || 'Watch API non ok');
    }

    const embedCandidates = [
      watch.videoUrl,
      ...(watch.servers ?? []).map((s) => s.link),
    ].filter((u): u is string => !!u);

    const sources: StreamSource[] = [];
    const seen = new Set<string>();

    for (const [index, embedUrl] of embedCandidates.entries()) {
      try {
        const { playlistUrl, token, referer } = playlistUrlFromEmbed(embedUrl);
        const playlist = await this.ctx.http.getJson<SaturnPlaylist>(playlistUrl, {
          headers: { 'X-Proxy-Referer': referer },
        });
        if (playlist.ok === false) continue;
        const decoded = decodeSaturnPayload(playlist.d ?? '', token);
        for (const src of sourcesFromDecoded(decoded, `Server ${index + 1}`)) {
          if (seen.has(src.url)) continue;
          seen.add(src.url);
          sources.push(src);
        }
      } catch (err) {
        this.ctx.logger.warn('AnimeSaturn server resolve failed', { embedUrl, err });
      }
    }

    return sources;
  }
}
