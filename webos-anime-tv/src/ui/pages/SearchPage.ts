import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { createCard } from '../components/Card';
import { debounce } from '../../core/utils';

export async function renderSearchPage(ctx: AppContext, root: HTMLElement): Promise<void> {
  ctx.focus.clear();
  ctx.focus.setScope('search');
  root.innerHTML = '';
  root.className = 'page search-layout';

  root.appendChild(createTopNav('search', ctx.focus, (name) => void ctx.router.navigate(name, {}, true)));

  const title = document.createElement('h1');
  title.className = 'details-title';
  title.textContent = 'Ricerca';
  root.appendChild(title);

  const input = document.createElement('input');
  input.className = 'search-input';
  input.type = 'search';
  input.placeholder = 'Cerca un titolo…';
  input.dataset.focusId = 'search-input';
  input.tabIndex = -1;
  root.appendChild(input);
  ctx.focus.register({ id: 'search-input', el: input, group: 'search', row: 1, col: 0 });

  const status = document.createElement('div');
  status.className = 'muted';
  status.textContent = 'Digita e premi Invio, oppure attendi i risultati.';
  root.appendChild(status);

  const grid = document.createElement('div');
  grid.className = 'results-grid';
  root.appendChild(grid);

  const settings = await ctx.persistence.settings.getOrCreate(ctx.config);

  const runSearch = async (query: string) => {
    grid.innerHTML = '';
    if (!query.trim()) {
      status.textContent = 'Inserisci almeno un carattere.';
      return;
    }
    status.textContent = 'Ricerca in corso…';
    const { items, errors } = await ctx.services.search.search(query, settings.preferredProviderId, {
      kind: 'anime',
    });
    status.textContent = errors.length
      ? `${items.length} risultati · ${errors.join(' · ')}`
      : `${items.length} risultati`;

    items.forEach((anime, index) => {
      const focusId = `search-result-${index}`;
      const card = createCard(anime, focusId);
      card.addEventListener('click', () => {
        void ctx.services.library.openAnime(anime);
        void ctx.router.navigate('details', { providerId: anime.providerId, animeId: anime.id });
      });
      grid.appendChild(card);
      ctx.focus.register({ id: focusId, el: card, group: 'results', row: 2 + Math.floor(index / 6), col: index % 6 });
    });
  };

  const debounced = debounce((q: string) => void runSearch(q), 450);
  input.addEventListener('input', () => debounced(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void runSearch(input.value);
    }
  });

  ctx.focus.focus('search-input');
}
