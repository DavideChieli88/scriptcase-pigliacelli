import { beforeEach, describe, expect, it } from 'vitest';
import { resetDbHandle, openDatabase } from '@/persistence/db';
import { progressTracker } from '@/services/ProgressTracker';
import { historyRepo } from '@/persistence/repositories/HistoryRepo';
import { progressRepo } from '@/persistence/repositories/ProgressRepo';
import { settingsService } from '@/services/SettingsService';
import type { AnimeSummary, Episode } from '@/domain/models';

const anime: AnimeSummary = {
  id: 'mock:shonen-blade',
  providerId: 'mock',
  title: 'Shonen Blade',
  posterUrl: 'poster.svg',
};

const episode: Episode = {
  id: 'mock:shonen-blade:ep1',
  animeId: anime.id,
  providerId: 'mock',
  number: 1,
  title: 'Episodio 1',
};

describe('ProgressTracker', () => {
  beforeEach(async () => {
    resetDbHandle();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('anime-tv-db');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
    await openDatabase();
    await settingsService.load();
    progressTracker.cancel();
  });

  it('flush preserves history title and poster', async () => {
    progressTracker.record(anime, episode, 40, 100);
    await progressTracker.flush();

    const progress = await progressRepo.get(episode.id);
    expect(progress?.percent).toBe(0.4);
    expect(progress?.completed).toBe(false);

    const history = await historyRepo.get(anime.id);
    expect(history?.title).toBe('Shonen Blade');
    expect(history?.posterUrl).toBe('poster.svg');
    expect(history?.episodeId).toBe(episode.id);
  });

  it('marks completed above threshold', async () => {
    progressTracker.record(anime, episode, 95, 100);
    await progressTracker.flush();
    const progress = await progressRepo.get(episode.id);
    expect(progress?.completed).toBe(true);
  });

  it('pickResumeEpisode prefers in-progress', () => {
    const episodes = [
      { ...episode, id: 'ep1', number: 1 },
      { ...episode, id: 'ep2', number: 2 },
      { ...episode, id: 'ep3', number: 3 },
    ];
    const picked = progressTracker.pickResumeEpisode(episodes, [
      {
        animeId: anime.id,
        episodeId: 'ep2',
        providerId: 'mock',
        currentTime: 20,
        duration: 100,
        percent: 0.2,
        completed: false,
        updatedAt: Date.now(),
      },
    ]);
    expect(picked?.id).toBe('ep2');
  });

  it('pickResumeEpisode picks next after last completed', () => {
    const episodes = [
      { ...episode, id: 'ep1', number: 1 },
      { ...episode, id: 'ep2', number: 2 },
      { ...episode, id: 'ep3', number: 3 },
    ];
    const picked = progressTracker.pickResumeEpisode(episodes, [
      {
        animeId: anime.id,
        episodeId: 'ep1',
        providerId: 'mock',
        currentTime: 100,
        duration: 100,
        percent: 1,
        completed: true,
        updatedAt: Date.now(),
      },
      {
        animeId: anime.id,
        episodeId: 'ep2',
        providerId: 'mock',
        currentTime: 100,
        duration: 100,
        percent: 1,
        completed: true,
        updatedAt: Date.now(),
      },
    ]);
    expect(picked?.id).toBe('ep3');
  });

  it('pickResumeEpisode defaults to first when nothing watched', () => {
    const episodes = [
      { ...episode, id: 'ep1', number: 1 },
      { ...episode, id: 'ep2', number: 2 },
    ];
    expect(progressTracker.pickResumeEpisode(episodes, [])?.id).toBe('ep1');
  });

  it('resolvePlayAction labels Continua vs Guarda', () => {
    const episodes = [
      { ...episode, id: 'ep1', number: 1 },
      { ...episode, id: 'ep2', number: 2 },
    ];

    const continueAction = progressTracker.resolvePlayAction(episodes, [
      {
        animeId: anime.id,
        episodeId: 'ep1',
        providerId: 'mock',
        currentTime: 20,
        duration: 100,
        percent: 0.2,
        completed: false,
        updatedAt: Date.now(),
      },
    ]);
    expect(continueAction).toEqual({
      episode: episodes[0],
      continuing: true,
      label: 'Continua ep. 1',
    });

    const watchAction = progressTracker.resolvePlayAction(episodes, [
      {
        animeId: anime.id,
        episodeId: 'ep1',
        providerId: 'mock',
        currentTime: 100,
        duration: 100,
        percent: 1,
        completed: true,
        updatedAt: Date.now(),
      },
    ]);
    expect(watchAction).toEqual({
      episode: episodes[1],
      continuing: false,
      label: 'Guarda ep. 2',
    });

    expect(progressTracker.resolvePlayAction(episodes, [])).toEqual({
      episode: episodes[0],
      continuing: false,
      label: 'Guarda ep. 1',
    });
  });

  it('removeContinue deletes one episode progress', async () => {
    progressTracker.record(anime, episode, 40, 100);
    await progressTracker.flush();
    await progressTracker.removeContinue(episode.id);
    expect(await progressRepo.get(episode.id)).toBeUndefined();
  });

  it('removeFromHistory deletes history only', async () => {
    progressTracker.record(anime, episode, 40, 100);
    await progressTracker.flush();
    await progressTracker.removeFromHistory(anime.id);
    expect(await historyRepo.get(anime.id)).toBeUndefined();
    expect(await progressRepo.get(episode.id)).toBeTruthy();
  });
});
