import type { RouteName } from './AppRouter';

export interface RouteDefinition {
  name: RouteName;
  pageId: string;
}

export const ROUTES: RouteDefinition[] = [
  { name: 'home', pageId: 'page-home' },
  { name: 'search', pageId: 'page-search' },
  { name: 'details', pageId: 'page-details' },
  { name: 'player', pageId: 'page-player' },
  { name: 'watchlist', pageId: 'page-watchlist' },
  { name: 'settings', pageId: 'page-settings' },
];
