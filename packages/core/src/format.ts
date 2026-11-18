/**
 * FORMAT_VERSION tags every bundle and serialised chain.
 * Changing canonical serialisation requires bumping this value;
 * the verifier refuses bundles whose version does not match.
 */
export const FORMAT_VERSION = 'anchora/1' as const;
export type FormatVersion = typeof FORMAT_VERSION;
