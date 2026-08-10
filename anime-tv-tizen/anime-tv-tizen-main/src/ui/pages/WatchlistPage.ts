import { el, clear, setText } from '../mount';
import { createTopBar } from '../components/TopBar';
import { createPosterCard } from '../components/PosterCard';
import { createEmptyState } from '../components/EmptyState';
import { watchlistRepo } from '@/persistence/repositories/WatchlistRepo';
import { focusEngine } from '@/navigation/FocusEngine';
import { router } from '@/router/AppRouter';

export class WatchlistPage {
  readonly root: HTMLElement;
  private content: HTMLElement;

  constructor() {
    this.root = el('section', 'page page--watchlist', { id: 'page-watchlist' });
    this.content = el('div', 'watchlist-page');
    this.root.appendChild(this.content);
  }

  async show(): Promise<void> {
    this.root.classList.add('is-active');
    focusEngine.setRoot(this.root);
    focusEngine.setScope('watchlist');
    await this.render();
  }

  hide(): void {
    this.root.classList.remove('is-active');
  }

  private async render(): Promise<void> {
    clear(this.content);
    this.content.appendChild(createTopBar('watchlist'));
    const title = el('h1', 'page-title');
    setText(title, 'Watchlist');
    this.content.appendChild(title);

    const items = await watchlistRepo.list();
    if (!items.length) {
      this.content.appendChild(
        createEmptyState(
          '',
          'Aggiungi titoli dalla scheda anime per ritrovarli qui.',
          'Vai alla Home',
          () => router.reset(),
        ),
      );
      focusEngine.focusDefault('empty-action');
      return;
    }

    const grid = el('div', 'search-grid');
    items.forEach((entry, i) => {
      grid.appendChild(
        createPosterCard({
          anime: {
            id: entry.animeId,
            providerId: entry.providerId,
            title: entry.title,
            posterUrl: entry.posterUrl,
            year: entry.year,
            genres: entry.genres,
          },
          focusId: `watchlist-${i}`,
          row: `watchlist-row-${Math.floor(i / 5)}`,
          onSelect: (a) => router.push('details', { animeId: a.id }),
        }),
      );
    });
    this.content.appendChild(grid);
    focusEngine.focusDefault('watchlist-0');
  }
}
