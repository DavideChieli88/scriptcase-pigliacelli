import type {
  AnimeDetails,
  AnimeSummary,
  Episode,
  HomeFeed,
  StreamSource,
} from '@/domain/models';
import { makeAnimeId, makeEpisodeId } from '@/domain/ids';
import { ProviderError } from '@/domain/errors';
import type { ContentProvider, ProviderResult } from '../types';
import { errResult, okResult } from '../types';
import { debugLog } from '@/utils/debugLog';

interface MockAnime {
  externalId: string;
  title: string;
  description: string;
  year: number;
  genres: string[];
  status: 'ongoing' | 'completed';
  episodeCount: number;
  posterColor: string;
}

const CATALOG: MockAnime[] = [
  {
    externalId: 'shonen-blade',
    title: 'Shonen Blade',
    description:
      'Un giovane spadaccino eredita una lama leggendaria e deve proteggere la città dalle creature dell’ombra.',
    year: 2023,
    genres: ['Azione', 'Avventura'],
    status: 'ongoing',
    episodeCount: 12,
    posterColor: '1a2740',
  },
  {
    externalId: 'neon-district',
    title: 'Neon District',
    description:
      'In una metropoli cyberpunk, una hacker e un detective inseguono un mistero nascosto nella rete.',
    year: 2022,
    genres: ['Sci-Fi', 'Mistero'],
    status: 'completed',
    episodeCount: 24,
    posterColor: '2a1830',
  },
  {
    externalId: 'sakura-lines',
    title: 'Sakura Lines',
    description:
      'Due studenti si incontrano ogni primavera sulla stessa linea ferroviaria, in una storia delicata e malinconica.',
    year: 2021,
    genres: ['Romance', 'Slice of Life'],
    status: 'completed',
    episodeCount: 13,
    posterColor: '301820',
  },
  {
    externalId: 'orbital-academy',
    title: 'Orbital Academy',
    description:
      'Cadetti spaziali affrontano addestramento estremo e segreti politici a bordo di un’accademia orbitale.',
    year: 2024,
    genres: ['Sci-Fi', 'Dramma'],
    status: 'ongoing',
    episodeCount: 8,
    posterColor: '102830',
  },
  {
    externalId: 'kitchen-wars',
    title: 'Kitchen Wars',
    description:
      'Chef rivali competono in sfide culinarie impossibili dove ogni piatto racconta una storia.',
    year: 2020,
    genres: ['Commedia', 'Gourmet'],
    status: 'completed',
    episodeCount: 16,
    posterColor: '302810',
  },
  {
    externalId: 'midnight-library',
    title: 'Midnight Library',
    description:
      'Una bibliotecaria notturna cataloga libri che alterano i ricordi di chi li legge.',
    year: 2023,
    genres: ['Fantasy', 'Thriller'],
    status: 'ongoing',
    episodeCount: 10,
    posterColor: '181830',
  },
  {
    externalId: 'iron-garden',
    title: 'Iron Garden',
    description:
      'Mecha e giardinieri robotici combattono per salvare l’ultima oasi verde sulla Terra.',
    year: 2019,
    genres: ['Mecha', 'Avventura'],
    status: 'completed',
    episodeCount: 26,
    posterColor: '183018',
  },
  {
    externalId: 'echo-protocol',
    title: 'Echo Protocol',
    description:
      'Un’unità speciale usa echi temporali per prevenire catastrofi… a un costo personale.',
    year: 2024,
    genres: ['Azione', 'Sci-Fi'],
    status: 'ongoing',
    episodeCount: 6,
    posterColor: '203040',
  },
];

function posterUrl(color: string, title: string): string {
  const label = encodeURIComponent(title.slice(0, 18));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="420">
    <rect width="280" height="420" fill="#${color}"/>
    <text x="140" y="210" text-anchor="middle" fill="#f2f4f8" font-family="Segoe UI,Arial" font-size="22">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function findByExternalId(animeId: string): MockAnime | undefined {
  const external = animeId.includes(':') ? animeId.slice(animeId.indexOf(':') + 1) : animeId;
  return CATALOG.find((a) => a.externalId === external);
}

/** Sample MP4 (Big Buck Bunny) — public domain test stream. */
const SAMPLE_MP4 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export class MockProvider implements ContentProvider {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;

  constructor(id = 'mock', label = 'Mock (dev)', enabled = true) {
    this.id = id;
    this.label = label;
    this.enabled = enabled;
  }

  private toSummary(item: MockAnime): AnimeSummary {
    return {
      id: makeAnimeId(this.id, item.externalId),
      providerId: this.id,
      title: item.title,
      posterUrl: posterUrl(item.posterColor, item.title),
      backdropUrl: posterUrl(item.posterColor, item.title),
      year: item.year,
      genres: item.genres,
      status: item.status,
    };
  }

  private buildEpisodes(item: MockAnime): Episode[] {
    const animeId = makeAnimeId(this.id, item.externalId);
    const episodes: Episode[] = [];
    for (let n = 1; n <= item.episodeCount; n++) {
      episodes.push({
        id: makeEpisodeId(this.id, item.externalId, n),
        animeId,
        providerId: this.id,
        number: n,
        title: `Episodio ${n}`,
      });
    }
    return episodes;
  }

  async getHome(): Promise<ProviderResult<HomeFeed>> {
    debugLog.push('provider', 'debug', `${this.id}.getHome`);
    const summaries = CATALOG.map((item) => this.toSummary(item));
    return okResult(this.id, {
      featured: summaries[0] ?? null,
      recentlyAdded: summaries.slice(0, 6),
      popular: summaries.slice().reverse(),
    });
  }

  async search(query: string): Promise<ProviderResult<AnimeSummary[]>> {
    debugLog.push('provider', 'debug', `${this.id}.search`, { query });
    const q = query.trim().toLowerCase();
    if (!q) return okResult(this.id, CATALOG.map((item) => this.toSummary(item)));
    const results = CATALOG.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.genres.some((g) => g.toLowerCase().includes(q)),
    ).map((item) => this.toSummary(item));
    return okResult(this.id, results);
  }

  async getAnimeDetails(id: string): Promise<ProviderResult<AnimeDetails>> {
    debugLog.push('provider', 'debug', `${this.id}.getAnimeDetails`, { id });
    const item = findByExternalId(id);
    if (!item) {
      return errResult(
        this.id,
        new ProviderError('empty', `Anime non trovato: ${id}`, this.id),
      );
    }
    const summary = this.toSummary(item);
    const episodes = this.buildEpisodes(item);
    return okResult(this.id, {
      ...summary,
      description: item.description,
      episodeCount: item.episodeCount,
      episodes,
    });
  }

  async getEpisodes(animeId: string): Promise<ProviderResult<Episode[]>> {
    const item = findByExternalId(animeId);
    if (!item) {
      return errResult(
        this.id,
        new ProviderError('empty', `Episodi non trovati: ${animeId}`, this.id),
      );
    }
    return okResult(this.id, this.buildEpisodes(item));
  }

  async getStreamSources(
    animeId: string,
    episodeId: string,
  ): Promise<ProviderResult<StreamSource[]>> {
    debugLog.push('provider', 'debug', `${this.id}.getStreamSources`, { animeId, episodeId });
    const item = findByExternalId(animeId);
    if (!item) {
      return errResult(
        this.id,
        new ProviderError('empty', `Stream non disponibile: ${animeId}`, this.id),
      );
    }
    void episodeId;
    return okResult(this.id, [
      {
        url: SAMPLE_MP4,
        type: 'mp4',
        label: 'Sample 720p',
      },
    ]);
  }
}

export const mockProvider = new MockProvider('mock', 'Mock (dev)');
/** Secondary mock for multi-provider fallback UX / Settings cycling. */
export const mockAltProvider = new MockProvider('mock-alt', 'Mock B (dev)');
