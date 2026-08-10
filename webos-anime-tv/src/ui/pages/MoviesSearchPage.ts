import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { createCard } from '../components/Card';
import { debounce } from '../../core/utils';
import { isMovieProviderId } from '../../providers/failover';

const MIN_QUERY = 3;

export async function renderMoviesSearchPage(ctx: AppContext, root: HTMLElement): Promise<void> {
  ctx.focus.clear();
  ctx.focus.setScope('movies-search');
  root.innerHTML = '';
  root.className = 'page search-layout page--movies';

  root.appendChild(
    createTopNav('movies-search', ctx.focus, (name) => void ctx.router.navigate(name, {}, true)),
  );

  const title = document.createElement('h1');
  title.className = 'details-title movies-headline';
  title.textContent = 'Cerca film';
  root.appendChild(title);

  const input = document.createElement('input');
  input.className = 'search-input movies-search-input';
  input.type = 'search';
  input.placeholder = `Almeno ${MIN_QUERY} caratteri…`;
  input.dataset.focusId = 'movies-search-input';
  input.tabIndex = -1;
  root.appendChild(input);
  ctx.focus.register({ id: 'movies-search-input', el: input, group: 'search', row: 1, col: 0 });

  const status = document.createElement('div');
  status.className = 'muted';
  status.textContent = `Digita almeno ${MIN_QUERY} caratteri. In caso di 429 si prova il mirror.`;
  root.appendChild(status);

  const grid = document.createElement('div');
  grid.className = 'results-grid';
  root.appendChild(grid);

  const settings = await ctx.persistence.settings.getOrCreate(ctx.config);
  let requestId = 0;

  const runSearch = async (query: string) => {
    const id = ++requestId;
    grid.innerHTML = '';
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      status.textContent = `Inserisci almeno ${MIN_QUERY} caratteri (evita 429 sul sito).`;
      return;
    }
    status.textContent = 'Ricerca film…';
    const preferred =
      settings.preferredMoviesProviderId || ctx.config.defaultMoviesProviderId || 'altadefinizione';
    const { items, errors, usedProviderId } = await ctx.services.search.search(q, preferred, {
      kind: 'movies',
    });
    if (id !== requestId) return;

    const via = usedProviderId
      ? ctx.registry.get(usedProviderId)?.name ?? usedProviderId
      : undefined;
    status.textContent = errors.length
      ? `${items.length} risultati${via ? ` · via ${via}` : ''} · ${errors.join(' · ')}`
      : `${items.length} risultati${via ? ` · via ${via}` : ''}`;

    items.forEach((item, index) => {
      const focusId = `movies-search-result-${index}`;
      const card = createCard(item, focusId);
      card.addEventListener('click', () => {
        void ctx.services.library.openAnime(item);
        void ctx.router.navigate('details', { providerId: item.providerId, animeId: item.id });
      });
      grid.appendChild(card);
      ctx.focus.register({
        id: focusId,
        el: card,
        group: 'results',
        row: 2 + Math.floor(index / 6),
        col: index % 6,
      });
    });
  };

  const debounced = debounce((q: string) => void runSearch(q), 800);
  input.addEventListener('input', () => debounced(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void runSearch(input.value);
    }
  });

  // Quick cycle movies provider from search page (optional affordance via long label in status click)
  status.style.cursor = 'pointer';
  status.title = 'Tocca per cambiare provider Film preferito';
  status.addEventListener('click', async () => {
    const s = await ctx.persistence.settings.getOrCreate(ctx.config);
    const enabled = ctx.registry.list(true).filter((p) => isMovieProviderId(p.id));
    const idx = enabled.findIndex((p) => p.id === s.preferredMoviesProviderId);
    const next = enabled[(idx + 1) % Math.max(enabled.length, 1)];
    if (!next) return;
    await ctx.persistence.settings.update({ preferredMoviesProviderId: next.id });
    settings.preferredMoviesProviderId = next.id;
    status.textContent = `Provider Film: ${next.name} — digita per cercare`;
    if (input.value.trim().length >= MIN_QUERY) void runSearch(input.value);
  });

  ctx.focus.focus('movies-search-input');
}
