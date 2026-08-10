import { el, setText } from '../mount';
import { focusEngine } from '@/navigation/FocusEngine';
import { router } from '@/router/AppRouter';
import { settingsService } from '@/services/SettingsService';
import { providerBadge } from '@/utils/providerBadge';

export function createTopBar(active?: 'search' | 'watchlist' | 'settings'): HTMLElement {
  const bar = el('header', 'topbar');
  const brand = el('div', 'topbar__brand');
  const logo = el('img', 'topbar__logo', {
    src: './icon.png',
    alt: 'Anime TV',
  });
  const source = el('span', 'source-badge');
  setText(source, providerBadge(settingsService.get().preferredProviderId));
  brand.appendChild(logo);
  brand.appendChild(source);

  const nav = el('nav', 'topbar__nav');

  const items: Array<{ id: string; label: string; route: 'search' | 'watchlist' | 'settings' }> = [
    { id: 'nav-search', label: 'Cerca', route: 'search' },
    { id: 'nav-watchlist', label: 'Watchlist', route: 'watchlist' },
    { id: 'nav-settings', label: 'Impostazioni', route: 'settings' },
  ];

  for (const item of items) {
    const btn = el('button', 'topbar__item');
    setText(btn, item.label);
    if (active === item.route) btn.classList.add('is-active');
    focusEngine.register(btn, {
      id: item.id,
      row: 'topbar',
      onEnter: () => router.push(item.route),
    });
    btn.addEventListener('click', () => router.push(item.route));
    nav.appendChild(btn);
  }

  bar.appendChild(brand);
  bar.appendChild(nav);
  return bar;
}
