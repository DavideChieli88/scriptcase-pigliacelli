/** Ensure focused element is visible within page / rails / episode lists. */

/** Space for focus ring (4px) + glow (~24px) so outlines aren't clipped. */
const FOCUS_OUTSET = 32;
const PAGE_PADDING = 96;
const RAIL_PADDING = 80;

export function scrollFocusedIntoView(el: HTMLElement): void {
  const railTrack = el.closest('.rail__track') as HTMLElement | null;
  if (railTrack) {
    scrollWithinRail(el, railTrack);
  }

  const episodeList = el.closest('.episode-list') as HTMLElement | null;
  if (episodeList) {
    scrollWithinEpisodeList(el, episodeList);
  }

  const page = el.closest('.page') as HTMLElement | null;
  if (page) {
    scrollWithinPage(el, page);
  }
}

function scrollWithinRail(el: HTMLElement, track: HTMLElement): void {
  const elRect = el.getBoundingClientRect();
  const trackRect = track.getBoundingClientRect();
  const padding = RAIL_PADDING;

  if (elRect.left < trackRect.left + padding) {
    track.scrollLeft -= trackRect.left + padding - elRect.left;
  } else if (elRect.right > trackRect.right - padding) {
    track.scrollLeft += elRect.right - (trackRect.right - padding);
  }
}

function scrollWithinEpisodeList(el: HTMLElement, list: HTMLElement): void {
  const elRect = el.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  const padding = FOCUS_OUTSET;

  if (elRect.top < listRect.top + padding) {
    list.scrollTop -= listRect.top + padding - elRect.top;
  } else if (elRect.bottom > listRect.bottom - padding) {
    list.scrollTop += elRect.bottom - (listRect.bottom - padding);
  }
}

function scrollWithinPage(el: HTMLElement, page: HTMLElement): void {
  // Hero CTAs: bring the whole banner into view, not just the buttons.
  const hero = el.closest('.hero');
  const target = hero instanceof HTMLElement ? hero : el;
  const elRect = target.getBoundingClientRect();
  const pageRect = page.getBoundingClientRect();

  // Top padding clears the sticky topbar; bottom keeps focus glow on-screen.
  const paddingTop = PAGE_PADDING;
  const paddingBottom = hero ? FOCUS_OUTSET : PAGE_PADDING + FOCUS_OUTSET;

  if (elRect.top < pageRect.top + paddingTop) {
    page.scrollTop -= pageRect.top + paddingTop - elRect.top;
  } else if (elRect.bottom > pageRect.bottom - paddingBottom) {
    page.scrollTop += elRect.bottom - (pageRect.bottom - paddingBottom);
  }
}
