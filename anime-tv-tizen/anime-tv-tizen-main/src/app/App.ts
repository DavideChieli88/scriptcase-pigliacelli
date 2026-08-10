import { el } from '@/ui/mount';
import { createModal } from '@/ui/components/Modal';
import { HomePage } from '@/ui/pages/HomePage';
import { SearchPage } from '@/ui/pages/SearchPage';
import { DetailsPage } from '@/ui/pages/DetailsPage';
import { PlayerPage } from '@/ui/pages/PlayerPage';
import { WatchlistPage } from '@/ui/pages/WatchlistPage';
import { SettingsPage } from '@/ui/pages/SettingsPage';
import { router, type RouteState } from '@/router/AppRouter';
import { remoteInput } from '@/navigation/RemoteInput';
import { focusEngine } from '@/navigation/FocusEngine';
import { focusMemory } from '@/navigation/FocusMemory';
import { AppEvents, eventBus } from '@/state/EventBus';
import { progressTracker } from '@/services/ProgressTracker';
import { uiStore } from '@/state/stores/uiStore';
import { logger } from '@/utils/logger';
import type { RemoteAction } from '@/navigation/KeyMap';

export class App {
  private readonly shell: HTMLElement;
  private readonly main: HTMLElement;
  private readonly home = new HomePage();
  private readonly search = new SearchPage();
  private readonly details = new DetailsPage();
  private readonly player = new PlayerPage();
  private readonly watchlist = new WatchlistPage();
  private readonly settings = new SettingsPage();
  private currentName: RouteState['name'] | null = null;
  private exitModal: HTMLElement | null = null;
  private exitModalUnsub: (() => void) | null = null;
  private exitModalPreviousFocusId: string | null = null;

  constructor(host: HTMLElement) {
    this.shell = el('div', 'app-shell');
    this.main = el('div', 'app-main');
    this.main.appendChild(this.home.root);
    this.main.appendChild(this.search.root);
    this.main.appendChild(this.details.root);
    this.main.appendChild(this.player.root);
    this.main.appendChild(this.watchlist.root);
    this.main.appendChild(this.settings.root);
    this.shell.appendChild(this.main);
    host.appendChild(this.shell);
  }

  start(): void {
    remoteInput.start();
    remoteInput.push((action, _event) => this.onRemote(action));

    router.subscribe((route) => {
      void this.onRoute(route);
    });

    window.addEventListener('beforeunload', () => {
      void this.player.hide();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentName === 'player') {
        void progressTracker.flush();
      }
    });

    eventBus.on(AppEvents.PROGRESS_UPDATE, () => {
      uiStore.markHomeDirty('local');
    });

    void this.onRoute(router.current);
    logger.info('App', 'Started');
  }

  private async onRoute(route: RouteState): Promise<void> {
    eventBus.emit(AppEvents.ROUTE_CHANGE, route);
    logger.debug('App', `route → ${route.name}`, route.params);

    if (this.currentName === 'player' && route.name !== 'player') {
      await this.player.hide();
    }

    this.home.hide();
    this.search.hide();
    this.details.hide();
    if (route.name !== 'player') this.player.root.classList.remove('is-active');
    this.watchlist.hide();
    this.settings.hide();

    this.currentName = route.name;

    switch (route.name) {
      case 'home':
        await this.home.show();
        break;
      case 'search':
        await this.search.show();
        break;
      case 'details':
        await this.details.show(route.params);
        break;
      case 'player':
        await this.player.show(route.params);
        break;
      case 'watchlist':
        await this.watchlist.show();
        break;
      case 'settings':
        await this.settings.show();
        break;
    }
  }

  private onRemote(action: RemoteAction): boolean {
    if (this.currentName === 'player') {
      if (this.player.handleRemote(action)) return true;
    }

    if (action === 'back') {
      if (this.currentName === 'player') {
        void progressTracker.flush();
        uiStore.markHomeDirty('local');
      }
      if (router.back()) return true;
      this.showExitConfirm();
      return true;
    }

    return focusEngine.handleAction(action);
  }

  private showExitConfirm(): void {
    if (this.exitModal) return;

    this.exitModalPreviousFocusId = focusEngine.getCurrentId();

    const dismiss = (): void => {
      this.dismissExitConfirm();
    };

    const modal = createModal({
      title: 'Uscire dall\'app?',
      text: 'Vuoi chiudere l\'app o restare?',
      confirmLabel: 'OK',
      cancelLabel: 'Voglio restare',
      onConfirm: () => this.exitApp(),
      onCancel: dismiss,
    });

    this.exitModal = modal;
    this.shell.appendChild(modal);
    focusEngine.setRoot(modal);
    focusEngine.focusDefault('modal-confirm');

    this.exitModalUnsub = remoteInput.push((action) => {
      if (action === 'back') {
        dismiss();
        return true;
      }
      return focusEngine.handleAction(action);
    });
  }

  private dismissExitConfirm(): void {
    this.exitModalUnsub?.();
    this.exitModalUnsub = null;
    this.exitModal?.remove();
    this.exitModal = null;

    focusEngine.setRoot(this.home.root);
    focusEngine.setScope('home');
    focusEngine.focusDefault(
      this.exitModalPreviousFocusId || focusMemory.recall('home') || 'hero-play',
    );
    this.exitModalPreviousFocusId = null;
  }

  private exitApp(): void {
    logger.info('App', 'Exiting');
    try {
      window.tizen?.application?.getCurrentApplication()?.exit();
    } catch (err) {
      logger.warn('App', 'tizen exit failed', err);
    }
  }
}
