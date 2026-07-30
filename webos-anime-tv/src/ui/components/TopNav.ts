import type { FocusManager } from '../../core/focus/FocusManager';
import type { RouteName } from '../../core/navigation/Router';

const NAV: { name: RouteName; label: string; focusId: string }[] = [
  { name: 'home', label: 'Home', focusId: 'nav-home' },
  { name: 'search', label: 'Cerca', focusId: 'nav-search' },
  { name: 'watchlist', label: 'Preferiti', focusId: 'nav-watchlist' },
  { name: 'history', label: 'Cronologia', focusId: 'nav-history' },
  { name: 'settings', label: 'Impostazioni', focusId: 'nav-settings' },
];

export function createTopNav(
  active: RouteName,
  focus: FocusManager,
  onNavigate: (name: RouteName) => void,
): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'top-nav';
  nav.innerHTML = `<div class="brand">ANIME TV</div>`;

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
