import type { FocusManager } from '../../core/focus/FocusManager';
import type { RouteName } from '../../core/navigation/Router';

const NAV: { name: RouteName; label: string; focusId: string }[] = [
  { name: 'home', label: 'Anime', focusId: 'nav-home' },
  { name: 'movies', label: 'Film', focusId: 'nav-movies' },
  { name: 'search', label: 'Cerca anime', focusId: 'nav-search' },
  { name: 'movies-search', label: 'Cerca film', focusId: 'nav-movies-search' },
  { name: 'watchlist', label: 'Preferiti', focusId: 'nav-watchlist' },
  { name: 'history', label: 'Cronologia', focusId: 'nav-history' },
  { name: 'settings', label: 'Impostazioni', focusId: 'nav-settings' },
];

function isMoviesRoute(name: RouteName): boolean {
  return name === 'movies' || name === 'movies-search';
}

export function createTopNav(
  active: RouteName,
  focus: FocusManager,
  onNavigate: (name: RouteName) => void,
): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = `top-nav${isMoviesRoute(active) ? ' top-nav--movies' : ''}`;
  nav.innerHTML = `<div class="brand">${isMoviesRoute(active) ? 'FILM TV' : 'ANIME TV'}</div>`;

  for (const item of NAV) {
    const btn = document.createElement('button');
    btn.className = `nav-item${item.name === active ? ' is-active' : ''}`;
    btn.textContent = item.label;
    btn.dataset.focusId = item.focusId;
    btn.tabIndex = -1;
    btn.addEventListener('click', () => onNavigate(item.name));
    nav.appendChild(btn);
    focus.register({ id: item.focusId, el: btn, group: 'nav', row: 0, col: NAV.indexOf(item) });
  }

  return nav;
}

export { NAV };
