export interface NextEpisodePromptState {
  visible: boolean;
  episodeId?: string;
  episodeNumber?: number;
  title?: string;
}

export class NextEpisodePrompt {
  private state: NextEpisodePromptState = { visible: false };
  private listeners = new Set<(s: NextEpisodePromptState) => void>();

  subscribe(fn: (s: NextEpisodePromptState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  show(input: { episodeId: string; episodeNumber: number; title?: string }): void {
    this.state = { visible: true, ...input };
    this.emit();
  }

  hide(): void {
    this.state = { visible: false };
    this.emit();
  }

  getState(): NextEpisodePromptState {
    return this.state;
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}
