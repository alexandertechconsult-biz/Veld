export const APP_NAME = 'Veld';

export const APP_TAGLINE = 'Farm record-keeping that works offline.';

/**
 * Builds the browser tab title for a screen. The bare app name on the home
 * screen, and "<Screen> · Veld" everywhere else, so a farmer with several tabs
 * open can tell them apart. Trims and ignores empty screen names.
 */
export function formatDocumentTitle(screenTitle?: string): string {
  const trimmed = screenTitle?.trim();
  return trimmed ? `${trimmed} · ${APP_NAME}` : APP_NAME;
}
