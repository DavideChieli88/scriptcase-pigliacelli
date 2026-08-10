import { el, clear, setText } from '../mount';
import { createTopBar } from '../components/TopBar';
import { createPosterCard } from '../components/PosterCard';
import { createEmptyState } from '../components/EmptyState';
import { catalogService } from '@/services/CatalogService';
import { focusEngine } from '@/navigation/FocusEngine';
import { router } from '@/router/AppRouter';
import { debounce } from '@/utils/debounce';
import { APP_CONFIG } from '@/app/config';

export class SearchPage {
  readonly root: HTMLElement;
  private content: HTMLElement;
  private input: HTMLInputElement | null = null;
  private resultsEl: HTMLElement | null = null;

  private readonly runSearch = debounce((query: string) => {
    void this.search(query);
  }, APP_CONFIG.searchDebounceMs);

  constructor() {
    this.root = el('section', 'page page--search', { id: 'page-search' });
    this.content = el('div', 'search-page');
    this.root.appendChild(this.content);
  }

  async show(): Promise<void> {
    this.root.classList.add('is-active');
    focusEngine.setRoot(this.root);
    focusEngine.setScope('search');
    this.renderShell();
    focusEngine.focusDefault('search-input');
  }

  hide(): void {
    this.root.classList.remove('is-active');
    this.runSearch.cancel();
  }

  private renderShell(): void {
    clear(this.content);
    this.content.appendChild(createTopBar('search'));

    const title = el('h1', 'page-title');
    setText(title, 'Cerca');
    this.content.appendChild(title);

    this.input = el('input', 'search-input', {
      type: 'text',
      placeholder: 'Titolo, genere…',
      autocomplete: 'off',
    }) as HTMLInputElement;
    focusEngine.register(this.input, {
      id: 'search-input',
      row: 'search-bar',
    });
    this.input.addEventListener('input', () => {
      this.runSearch(this.input!.value);
    });
    this.content.appendChild(this.input);

    this.resultsEl = el('div', 'search-grid');
    this.content.appendChild(this.resultsEl);
  }

  private async search(query: string): Promise<void> {
    if (!this.resultsEl) return;
    clear(this.resultsEl);

    if (!query.trim()) {
      return;
    }

    const result = await catalogService.search(query);
    if (!result.ok) {
      this.resultsEl.appendChild(
        createEmptyState('Errore di ricerca', result.error.message, 'Riprova', () =>
          void this.search(query),
        ),
      );
      focusEngine.focusDefault('empty-action');
      return;
    }

    if (!result.data.length) {
      this.resultsEl.appendChild(
        createEmptyState('Nessun risultato', `Nessun titolo per “${query}”.`),
      );
      return;
    }

    result.data.forEach((anime, i) => {
      this.resultsEl!.appendChild(
        createPosterCard({
          anime,
          focusId: `search-${i}`,
          row: `search-row-${Math.floor(i / 5)}`,
          onSelect: (a) => router.push('details', { animeId: a.id }),
        }),
      );
    });
  }
}
