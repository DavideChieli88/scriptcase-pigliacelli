export type ProviderErrorKind =
  | 'network'
  | 'parse'
  | 'empty'
  | 'rateLimit'
  | 'timeout'
  | 'disabled'
  | 'unknown';

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly providerId: string;
  readonly cause?: unknown;

  constructor(
    kind: ProviderErrorKind,
    message: string,
    providerId: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
    this.providerId = providerId;
    this.cause = cause;
  }
}

export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}
