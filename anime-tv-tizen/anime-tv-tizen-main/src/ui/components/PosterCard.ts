import type { AnimeSummary, ContinueWatchingItem } from '@/domain/models';
import { el, setText } from '../mount';
import { focusEngine } from '@/navigation/FocusEngine';
import { imageLoader } from '@/services/ImageLoader';
import { APP_CONFIG } from '@/app/config';
import { providerBadge } from '@/utils/providerBadge';

export interface PosterCardOptions {
  anime: AnimeSummary;
  focusId: string;
  row: string;
  progress?: number;
  onSelect: (anime: AnimeSummary) => void;
  onLongPress?: (anime: AnimeSummary) => void;
}

export function createPosterCard(options: PosterCardOptions): HTMLElement {
  const { anime, focusId, row, progress, onSelect, onLongPress } = options;
  const card = el('article', 'poster-card');
  const img = el('img', 'poster-card__img', {
    alt: anime.title,
  }) as HTMLImageElement;
  img.width = 280;
  img.height = 420;
  imageLoader.observe(img, anime.posterUrl || APP_CONFIG.imageFallback);

  const source = el('span', 'source-badge poster-card__source');
  setText(source, providerBadge(anime.providerId));

  const title = el('div', 'poster-card__title');
  setText(title, anime.title);

  card.appendChild(img);
  card.appendChild(source);
  if (progress !== undefined && progress > 0.02) {
    const bar = el('div', 'poster-card__progress');
    const fill = el('div', 'poster-card__progress-bar');
    fill.style.width = `${Math.round(progress * 100)}%`;
    bar.appendChild(fill);
    card.appendChild(bar);
  }
  card.appendChild(title);

  focusEngine.register(card, {
    id: focusId,
    row,
    onEnter: () => onSelect(anime),
    onLongPress: onLongPress ? () => onLongPress(anime) : undefined,
  });
  card.addEventListener('click', () => onSelect(anime));

  return card;
}

export function createContinueCard(
  item: ContinueWatchingItem,
  focusId: string,
  row: string,
  onSelect: (item: ContinueWatchingItem) => void,
  onLongPress?: (item: ContinueWatchingItem) => void,
): HTMLElement {
  const card = createPosterCard({
    anime: item.anime,
    focusId,
    row,
    progress: item.progress.percent,
    onSelect: () => onSelect(item),
    onLongPress: onLongPress ? () => onLongPress(item) : undefined,
  });
  return card;
}
