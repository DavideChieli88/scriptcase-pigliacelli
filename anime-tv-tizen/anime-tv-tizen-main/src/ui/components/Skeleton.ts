import { el } from '../mount';

export function createHomeSkeleton(): HTMLElement {
  const wrap = el('div', 'home-skeleton');
  wrap.appendChild(el('div', 'skeleton skeleton-hero'));
  wrap.appendChild(el('div', 'skeleton skeleton-rail'));
  wrap.appendChild(el('div', 'skeleton skeleton-rail'));
  return wrap;
}

export function createDetailsSkeleton(): HTMLElement {
  const layout = el('div', 'details-page details-skeleton');

  layout.appendChild(el('div', 'skeleton skeleton-cover'));

  const info = el('div', 'details-skeleton__info');
  info.appendChild(el('div', 'skeleton skeleton-line skeleton-line--title'));
  info.appendChild(el('div', 'skeleton skeleton-line skeleton-line--meta'));
  info.appendChild(el('div', 'skeleton skeleton-line skeleton-line--desc'));
  info.appendChild(el('div', 'skeleton skeleton-line skeleton-line--desc skeleton-line--short'));

  const actions = el('div', 'details-skeleton__actions');
  actions.appendChild(el('div', 'skeleton skeleton-btn'));
  actions.appendChild(el('div', 'skeleton skeleton-btn skeleton-btn--ghost'));
  info.appendChild(actions);

  info.appendChild(el('div', 'skeleton skeleton-line skeleton-line--section'));

  const list = el('div', 'details-skeleton__episodes');
  for (let i = 0; i < 5; i++) {
    list.appendChild(el('div', 'skeleton skeleton-episode'));
  }
  info.appendChild(list);

  layout.appendChild(info);
  return layout;
}

export function createGridSkeleton(count = 8): HTMLElement {
  const wrap = el('div', 'search-grid');
  for (let i = 0; i < count; i++) {
    const card = el('div', 'skeleton');
    card.style.height = '420px';
    wrap.appendChild(card);
  }
  return wrap;
}
