import type { ContentProvider, ProviderCapabilities, ProviderContext } from '../types';
import { errResult, okResult } from '../types';
import type { AnimeDetails, HomeSection, StreamSource } from '../../domain/models';
import {
  extractArchivioRecords,
  extractEmbedUrl,
  mapApiEpisodes,
  parseAnimePageMeta,
  parseHomeSummaries,
  recordToSummary,
  resolveVixcloudPlaylist,
  type AnimeUnityApiEpisode,
} from './parser';

const CAPABILITIES: ProviderCapabilities = {
  home: true,
  search: true,
  details: true,
  episodes: true,
  stream: true,
  offlineCache: true,
};

/**
 * AnimeUnity — fetch diretto (useProxy=false).
 * Su webOS packaged app di solito non serve il CORS proxy PC.
 */
export class AnimeUnityProvider implements ContentProvider {
  readonly id = 'animeunity';
  readonly name = 'AnimeUnity';
  readonly baseUrl = 'https://www.animeunity.so';
  enabled: boolean;
  readonly capabilities = CAPABILITIES;

  constructor(
    private ctx: ProviderContext,
    enabled = true,
  ) {
    this.enabled = enabled;
  }

  /** Always bypass personal CORS proxy. */
  private getText(url: string): Promise<string> {
    return this.ctx.http.getText(url, {}, false);
  }

  private getJson<T>(url: string): Promise<T> {
    return this.ctx.http.getJson<T>(url, {}, false);
  }

  private async fetchCached(pathOrUrl: string, kind: 'html' | 'json' = 'html'): Promise<string> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`;
    const cacheKey = `au:${kind}:${url}`;
    const cached = await this.ctx.cache.getFresh(cacheKey);
    if (cached) return cached.value;
    const text = await this.getText(url);
    await this.ctx.cache.set({
      key: cacheKey,
      kind,
      value: text,
      ttlMs: this.ctx.cacheTtlMs,
    });
    return text;
  }

  async getHome() {
    try {
      const [homeHtml, archivioHtml] = await Promise.all([
        this.fetchCached('/'),
        this.fetchCached('/archivio'),
      ]);

      const latest = parseHomeSummaries(homeHtml, 18);
      const catalog = extractArchivioRecords(archivioHtml).map(recordToSummary).slice(0, 18);

      const sections: HomeSection[] = [];
      if (latest.length) sections.push({ id: 'au-latest', title: 'Ultime aggiunte', items: latest });
      if (catalog.length) sections.push({ id: 'au-catalog', title: 'Catalogo', items: catalog });

      if (!sections.length) {
        return errResult(this.id, 'PARSE_ERROR', 'Home AnimeUnity vuota', true);
      }

      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, sections);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      this.ctx.logger.warn('AnimeUnity getHome failed', e);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }

  async search(query: string) {
    try {
      const q = query.trim();
      if (!q) return okResult(this.id, []);
      const html = await this.fetchCached(`/archivio?title=${encodeURIComponent(q)}`);
      const items = extractArchivioRecords(html).map(recordToSummary);
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
      const id = animeId.replace(/^\/?anime\//, '');
      const pageHtml = await this.fetchCached(`/anime/${id}`);
      const meta = parseAnimePageMeta(pageHtml, id);
      const total = meta.episodesCount || 1;
      const episodesPerPage = 120;
      const pages = Math.max(1, Math.ceil(total / episodesPerPage));
      const episodes = [];

      for (let page = 1; page <= pages; page++) {
        const end = page * episodesPerPage;
        const start = end - episodesPerPage + 1;
        const apiUrl = `${this.baseUrl}/info_api/${id}/1?start_range=${start}&end_range=${end}`;
        const payload = await this.getJson<{ episodes?: AnimeUnityApiEpisode[] }>(apiUrl);
        episodes.push(...mapApiEpisodes(id, payload.episodes ?? []));
        if ((payload.episodes?.length ?? 0) < episodesPerPage) break;
      }

      const details: AnimeDetails = {
        id,
        providerId: this.id,
        title: meta.title,
        slug: id,
        coverUrl: meta.coverUrl,
        description: meta.description,
        genres: meta.genres,
        status: 'unknown',
        episodes,
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
        details.error?.message ?? 'Episodi non disponibili',
      );
    }
    return okResult(this.id, details.data.episodes);
  }

  async getStreamSources(episodeId: string) {
    try {
      const path = episodeId.replace(/^\/?anime\//, '');
      const epHtml = await this.getText(`${this.baseUrl}/anime/${path}`);
      const embedUrl = extractEmbedUrl(epHtml);
      if (!embedUrl) {
        return errResult(this.id, 'PARSE_ERROR', 'Embed AnimeUnity non trovato', true);
      }

      const embedHtml = await this.getText(embedUrl);
      const sources: StreamSource[] = resolveVixcloudPlaylist(embedHtml);
      if (!sources.length) {
        return errResult(this.id, 'PARSE_ERROR', 'Playlist Vixcloud non risolvibile', true);
      }

      await this.ctx.providerState.recordSuccess(this.id);
      return okResult(this.id, sources);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.ctx.providerState.recordError(this.id, message);
      this.ctx.logger.warn('AnimeUnity getStreamSources failed', e);
      return errResult(this.id, 'NETWORK_ERROR', message, true);
    }
  }
}
