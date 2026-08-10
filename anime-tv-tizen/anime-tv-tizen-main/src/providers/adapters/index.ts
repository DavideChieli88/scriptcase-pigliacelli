/**
 * Adapter package entry — re-exports for documentation / tests.
 * UI must never import parsers from here for rendering.
 */
export type { AdapterConfig, AdapterRoutes, HtmlParsers } from './types';
export type {
  AnimeSummaryDto,
  AnimeDetailsDto,
  EpisodeDto,
  HomeFeedDto,
  StreamSourceDto,
} from './dto';
export { ExternalHtmlProvider } from './ExternalHtmlProvider';
export { createExperimentalProviders } from './registerExperimental';
export { createTemplateProvider, createFixtureParsers } from './_template';
