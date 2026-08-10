import type { AppContext } from './context';
import type { RouteState } from '../core/navigation/Router';
import { renderHomePage } from '../ui/pages/HomePage';
import { renderSearchPage } from '../ui/pages/SearchPage';
import { renderMoviesHomePage } from '../ui/pages/MoviesHomePage';
import { renderMoviesSearchPage } from '../ui/pages/MoviesSearchPage';
import { renderDetailsPage } from '../ui/pages/DetailsPage';
import { renderPlayerPage } from '../ui/pages/PlayerPage';
import { renderWatchlistPage } from '../ui/pages/WatchlistPage';
import { renderHistoryPage } from '../ui/pages/HistoryPage';
import { renderSettingsPage } from '../ui/pages/SettingsPage';
import { logger } from '../core/logging/Logger';

export function registerRoutes(ctx: AppContext): void {
  const { router, root } = ctx;

  router.on('home', async () => {
    await renderHomePage(ctx, root);
  });

  router.on('search', async () => {
    await renderSearchPage(ctx, root);
  });

  router.on('movies', async () => {
    await renderMoviesHomePage(ctx, root);
  });

  router.on('movies-search', async () => {
    await renderMoviesSearchPage(ctx, root);
  });

  router.on('details', async (state: RouteState) => {
    await renderDetailsPage(ctx, root, state.params);
  });

  router.on('player', async (state: RouteState) => {
    await renderPlayerPage(ctx, root, state.params);
  });

  router.on('watchlist', async () => {
    await renderWatchlistPage(ctx, root);
  });

  router.on('history', async () => {
    await renderHistoryPage(ctx, root);
  });

  router.on('settings', async () => {
    await renderSettingsPage(ctx, root);
  });

  logger.debug('Routes registered');
}
