import type { AnimeSummary, ContinueWatchingItem } from '@/domain/models';
import { el, clear, setText } from '../mount';
import { createContinueCard, createPosterCard } from './PosterCard';
import {
  computeVirtualWindow,
  railBufferForViewport,
  railItemStride,
} from './virtualWindow';
import { AppEvents, eventBus } from '@/state/EventBus';
import { focusEngine } from '@/navigation/FocusEngine';
import { imageLoader } from '@/services/ImageLoader';
import { APP_CONFIG } from '@/app/config';

const POSTER_W = 280;
const RAIL_GAP = 24;
const MIN_BUFFER = APP_CONFIG.railVirtualBuffer;
/** Detached cards kept warm so revisiting an index doesn't flash fallback. */
const PARK_LIMIT = 24;

export interface RailOptions {
  id: string;
  title: string;
  items: AnimeSummary[];
  onSelect: (anime: AnimeSummary) => void;
  onLongPress?: (anime: AnimeSummary, index: number) => void;
  progressMap?: Map<string, number>;
}

export interface ContinueRailOptions {
  id: string;
  title: string;
  items: ContinueWatchingItem[];
  onSelect: (item: ContinueWatchingItem) => void;
  onLongPress?: (item: ContinueWatchingItem, index: number) => void;
}

type RailDestroy = () => void;

/**
 * Horizontally virtualized content rail.
 * Keeps a sliding window of poster cards in the DOM to limit memory on TV.
 */
export function createContentRail(options: RailOptions): HTMLElement {
  return mountVirtualRail({
    id: options.id,
    title: options.title,
    length: options.items.length,
    renderCard: (index) =>
      createPosterCard({
        anime: options.items[index],
        focusId: `${options.id}-${index}`,
        row: options.id,
        progress: options.progressMap?.get(options.items[index].id),
        onSelect: options.onSelect,
        onLongPress: options.onLongPress
          ? (anime) => options.onLongPress!(anime, index)
          : undefined,
      }),
  });
}

export function createContinueRail(options: ContinueRailOptions): HTMLElement {
  return mountVirtualRail({
    id: options.id,
    title: options.title,
    length: options.items.length,
    renderCard: (index) =>
      createContinueCard(
        options.items[index],
        `${options.id}-${index}`,
        options.id,
        options.onSelect,
        options.onLongPress
          ? (item) => options.onLongPress!(item, index)
          : undefined,
      ),
  });
}

export function destroyRail(section: HTMLElement): void {
  const destroy = (section as HTMLElement & { __destroyRail?: RailDestroy }).__destroyRail;
  destroy?.();
}

export function updateRail(section: HTMLElement, options: RailOptions): void {
  destroyRail(section);
  clear(section);
  const rebuilt = createContentRail(options);
  adoptRail(section, rebuilt, options.id);
}

export function updateContinueRail(section: HTMLElement, options: ContinueRailOptions): void {
  destroyRail(section);
  clear(section);
  const rebuilt = createContinueRail(options);
  adoptRail(section, rebuilt, options.id);
}

function adoptRail(section: HTMLElement, rebuilt: HTMLElement, id: string): void {
  while (rebuilt.firstChild) {
    section.appendChild(rebuilt.firstChild);
  }
  section.dataset.railId = id;
  type RailHost = HTMLElement & {
    __destroyRail?: RailDestroy;
    __prepareRailFocus?: (index: number) => HTMLElement | null;
  };
  const from = rebuilt as RailHost;
  const to = section as RailHost;
  if (from.__destroyRail) to.__destroyRail = from.__destroyRail;
  if (from.__prepareRailFocus) to.__prepareRailFocus = from.__prepareRailFocus;
}

interface VirtualRailMount {
  id: string;
  title: string;
  length: number;
  renderCard: (index: number) => HTMLElement;
}

function releaseCard(card: HTMLElement): void {
  const img = card.querySelector('img');
  if (img) imageLoader.unobserve(img);
  card.remove();
}

function mountVirtualRail(spec: VirtualRailMount): HTMLElement {
  const section = el('section', 'rail', { 'data-rail-id': spec.id });
  const title = el('h2', 'rail__title');
  setText(title, spec.title);

  const track = el('div', 'rail__track');
  const spacerBefore = el('div', 'rail__spacer');
  const windowEl = el('div', 'rail__window');
  const spacerAfter = el('div', 'rail__spacer');
  track.appendChild(spacerBefore);
  track.appendChild(windowEl);
  track.appendChild(spacerAfter);

  section.appendChild(title);
  section.appendChild(track);

  let start = 0;
  let end = 0;
  let focusIndex = 0;
  let rendering = false;
  const mounted = new Map<number, HTMLElement>();
  const parked = new Map<number, HTMLElement>();

  const stride = railItemStride(POSTER_W, RAIL_GAP);

  const currentBuffer = (): number =>
    railBufferForViewport(track.clientWidth || APP_CONFIG.designWidth, stride, MIN_BUFFER);

  const parkCard = (index: number, card: HTMLElement): void => {
    card.remove();
    parked.delete(index);
    parked.set(index, card);
    while (parked.size > PARK_LIMIT) {
      const oldest = parked.keys().next().value;
      if (oldest === undefined) break;
      const stale = parked.get(oldest);
      parked.delete(oldest);
      if (stale) releaseCard(stale);
    }
  };

  const takeCard = (index: number): HTMLElement => {
    const existing = mounted.get(index);
    if (existing) return existing;
    const warmed = parked.get(index);
    if (warmed) {
      parked.delete(index);
      mounted.set(index, warmed);
      return warmed;
    }
    const created = spec.renderCard(index);
    mounted.set(index, created);
    return created;
  };

  const syncWindow = (refocusId?: string): void => {
    rendering = true;
    const buffer = currentBuffer();
    const win = computeVirtualWindow(focusIndex, spec.length, buffer);

    // Spacers first so remaining cards keep stable content offsets (no scrollLeft hack).
    spacerBefore.style.flex = `0 0 ${win.start * stride}px`;
    spacerBefore.style.width = `${win.start * stride}px`;
    spacerAfter.style.flex = `0 0 ${(spec.length - win.end) * stride}px`;
    spacerAfter.style.width = `${(spec.length - win.end) * stride}px`;

    for (const [index, card] of [...mounted]) {
      if (index < win.start || index >= win.end) {
        mounted.delete(index);
        parkCard(index, card);
      }
    }

    for (let i = win.start; i < win.end; i++) {
      windowEl.appendChild(takeCard(i));
    }

    start = win.start;
    end = win.end;
    rendering = false;

    if (!refocusId || focusEngine.getCurrentId() === refocusId) return;
    requestAnimationFrame(() => {
      focusEngine.focusById(refocusId);
    });
  };

  if (spec.length === 0) {
    const empty = el('div', 'rail__empty');
    setText(empty, 'Nessun titolo');
    track.appendChild(empty);
  } else {
    syncWindow();
  }

  const unsub = eventBus.on(
    AppEvents.FOCUS_CHANGE,
    (payload: { id?: string | null; row?: string | null }) => {
      if (rendering || payload.row !== spec.id || !payload.id) return;
      const prefix = `${spec.id}-`;
      if (!payload.id.startsWith(prefix)) return;
      const idx = Number(payload.id.slice(prefix.length));
      if (!Number.isFinite(idx)) return;

      focusIndex = idx;
      const win = computeVirtualWindow(focusIndex, spec.length, currentBuffer());
      if (win.start === start && win.end === end) return;
      syncWindow(payload.id);
    },
  );

  type RailHost = HTMLElement & {
    __destroyRail?: RailDestroy;
    __prepareRailFocus?: (index: number) => HTMLElement | null;
  };

  /** Ensure index is mounted so vertical entry can land on the first card. */
  (section as RailHost).__prepareRailFocus = (index: number): HTMLElement | null => {
    if (spec.length === 0) return null;
    focusIndex = Math.max(0, Math.min(spec.length - 1, index));
    const win = computeVirtualWindow(focusIndex, spec.length, currentBuffer());
    if (win.start !== start || win.end !== end || !mounted.has(focusIndex)) {
      syncWindow();
    }
    return mounted.get(focusIndex) ?? null;
  };

  (section as RailHost).__destroyRail = () => {
    unsub();
    delete (section as RailHost).__prepareRailFocus;
    for (const card of mounted.values()) {
      releaseCard(card);
    }
    mounted.clear();
    for (const card of parked.values()) {
      releaseCard(card);
    }
    parked.clear();
  };

  return section;
}
