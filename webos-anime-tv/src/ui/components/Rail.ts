import type { AnimeSummary } from '../../domain/models';
import { createCard } from './Card';

export function createRail(
  title: string,
  items: AnimeSummary[],
  groupId: string,
  onSelect: (anime: AnimeSummary) => void,
): { root: HTMLElement; focusIds: string[] } {
  const root = document.createElement('section');
  root.className = 'rail';
  root.innerHTML = `<h2 class="rail-title"></h2>`;
  root.querySelector('.rail-title')!.textContent = title;

  const track = document.createElement('div');
  track.className = 'rail-track';
  const focusIds: string[] = [];

  items.forEach((anime, index) => {
    const focusId = `${groupId}-${index}`;
    focusIds.push(focusId);
    const card = createCard(anime, focusId);
    card.addEventListener('click', () => onSelect(anime));
    track.appendChild(card);
  });

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Nessun elemento';
    track.appendChild(empty);
  }

  root.appendChild(track);
  return { root, focusIds };
}
