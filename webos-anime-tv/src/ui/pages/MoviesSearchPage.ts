import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { createCard } from '../components/Card';
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

  const form = document.createElement('div');
  form.className = 'movies-search-form';
  root.appendChild(form);

  const input = document.createElement('input');
  input.className = 'search-input movies-search-input';
  input.type = 'search';
  input.placeholder = `Almeno ${MIN_QUERY} caratteri…`;
  input.dataset.focusId = 'movies-search-input';
  input.tabIndex = -1;
  form.appendChild(input);
  ctx.focus.register({ id: 'movies-search-input', el: input, group: 'search', row: 1, col: 0 });

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'hero-cta primary movies-search-btn';
  searchBtn.textContent = 'Cerca';
  searchBtn.dataset.focusId = 'movies-search-btn';
  form.appendChild(searchBtn);
  ctx.focus.register({ id: 'movies-search-btn', el: searchBtn, group: 'search', row: 1, col: 1 });

  const status = document.createElement('div');
  status.className = 'muted';
  status.textContent = `Scrivi il titolo, poi premi Cerca (o Enter). Minimo ${MIN_QUERY} caratteri.`;
  root.appendChild(status);

  const grid = document.createElement('div');
  grid.className = 'results-grid';
  root.appendChild(grid);

  const settings = await ctx.persistence.settings.getOrCreate(ctx.config);
  let requestId = 0;
  let searching = false;

  const runSearch = async (query: string) => {
    if (searching) return;
    const id = ++requestId;
    grid.innerHTML = '';
    // Clear previous result focus nodes (nav + form stay registered).
    for (const node of [...ctx.focus.graph.all()]) {
      if (node.id.startsWith('movies-search-result-')) ctx.focus.graph.unregister(node.id);
    }

    const q = query.trim();
    if (q.length < MIN_QUERY) {
      status.textContent = `Inserisci almeno ${MIN_QUERY} caratteri, poi premi Cerca.`;
      return;
    }

    searching = true;
    searchBtn.disabled = true;
    status.textContent = 'Ricerca film…';
    try {
      const preferred =
        settings.preferredMoviesProviderId ||
        ctx.config.defaultMoviesProviderId ||
        'altadefinizione';
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
    } finally {
      searching = false;
      searchBtn.disabled = false;
    }
  };

  // No search-on-type: only button / Enter (avoids 429 from multi-page fetches).
  searchBtn.addEventListener('click', () => void runSearch(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void runSearch(input.value);
    }
  });

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
    status.textContent = `Provider Film: ${next.name} — premi Cerca per avviare`;
  });

  ctx.focus.focus('movies-search-input');
}
