import type {
  AnimeDetails,
  AnimeSummary,
  Episode,
  HomeSection,
  StreamSource,
} from '../../domain/models';
import type { ContentProvider, ProviderCapabilities } from '../types';
import { errResult, okResult } from '../types';
import type { AppConfig } from '../../core/config/AppConfig';

const CAPABILITIES: ProviderCapabilities = {
  home: true,
  search: true,
  details: true,
  episodes: true,
  stream: true,
  offlineCache: true,
};

function catalog(sampleVideoUrl: string): AnimeDetails[] {
  const base = (id: string, title: string, year: number, genres: string[], status: AnimeSummary['status']): AnimeDetails => {
    const episodes: Episode[] = Array.from({ length: 12 }, (_, i) => ({
      id: `${id}-ep-${i + 1}`,
      animeId: id,
      providerId: 'mock',
      number: i + 1,
      title: `Episodio ${i + 1}`,
      duration: 1440,
      streamAvailable: true,
      watched: false,
    }));
    return {
      id,
      providerId: 'mock',
      title,
      year,
      genres,
      status,
      rating: 8.2,
      description: `${title} — scheda di esempio per sviluppo e test telecomando su webOS TV.`,
      coverUrl: undefined,
      backdropUrl: undefined,
      studio: 'Mock Studio',
      originalTitle: title,
      episodes,
    };
  };

  return [
    base('mock-aurora', 'Aurora Protocol', 2024, ['Azione', 'Sci-Fi'], 'ongoing'),
    base('mock-harbor', 'Harbor Lights', 2023, ['Dramma', 'Slice of Life'], 'completed'),
    base('mock-ember', 'Ember Knights', 2025, ['Fantasy', 'Avventura'], 'ongoing'),
    base('mock-neon', 'Neon Circuit', 2022, ['Cyberpunk', 'Mistero'], 'completed'),
    base('mock-garden', 'Silent Garden', 2021, ['Romantico', 'Dramma'], 'completed'),
    base('mock-orbit', 'Orbit Zero', 2024, ['Mecha', 'Azione'], 'ongoing'),
    base('mock-tide', 'Crimson Tide', 2020, ['Sport', 'Dramma'], 'completed'),
    base('mock-vault', 'Iron Vault', 2025, ['Thriller', 'Azione'], 'ongoing'),
  ].map((a) => {
    // attach sample stream hint via description side-channel not needed; stream uses config URL
    void sampleVideoUrl;
    return a;
  });
}

export class MockProvider implements ContentProvider {
  readonly id = 'mock';
  readonly name = 'Mock Catalog';
  readonly baseUrl = 'mock://local';
  enabled: boolean;
  readonly capabilities = CAPABILITIES;
  private items: AnimeDetails[];
  private sampleVideoUrl: string;

  constructor(config: AppConfig, enabled = true) {
    this.enabled = enabled;
    this.sampleVideoUrl = config.sampleVideoUrl;
    this.items = catalog(config.sampleVideoUrl);
  }

  private summary(a: AnimeDetails): AnimeSummary {
    const { episodes: _e, ...rest } = a;
    return rest;
  }

  async getHome() {
    const items = this.items.map((a) => this.summary(a));
    const sections: HomeSection[] = [
      { id: 'popular', title: 'Popolari', items: items.slice(0, 6) },
      { id: 'recent', title: 'Aggiunti di recente', items: [...items].reverse().slice(0, 6) },
      { id: 'trending', title: 'In evidenza', items: items.slice(2, 8) },
    ];
    return okResult(this.id, sections);
  }

  async search(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return okResult(this.id, []);
    const results = this.items.filter((a) => a.title.toLowerCase().includes(q)).map((a) => this.summary(a));
    return okResult(this.id, results);
  }

  async getAnimeDetails(animeId: string) {
    const found = this.items.find((a) => a.id === animeId);
    if (!found) return errResult(this.id, 'UNAVAILABLE', `Anime ${animeId} non trovato`, false);
    return okResult(this.id, structuredClone(found));
  }

  async getEpisodes(animeId: string) {
    const details = await this.getAnimeDetails(animeId);
    if (!details.ok || !details.data) return errResult(this.id, 'UNAVAILABLE', 'Episodi non disponibili', false);
    return okResult(this.id, details.data.episodes);
  }

  async getStreamSources(episodeId: string) {
    const anime = this.items.find((a) => a.episodes.some((e) => e.id === episodeId));
    if (!anime) return errResult(this.id, 'UNAVAILABLE', 'Stream non trovato', false);
    const sources: StreamSource[] = [
      {
        url: this.sampleVideoUrl,
        type: 'mp4',
        quality: '720p',
        label: 'Sample',
      },
    ];
    return okResult(this.id, sources);
  }
}
