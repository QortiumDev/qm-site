import { getQdnArbitraryUrl } from './appCatalog';

export const BGM_SERVICE = 'AUDIO';
export const BGM_NAME = 'QuickMythril';
export const BGM_IDENTIFIER = 'qm-site-bgm';
export const BGM_TRACK_LABEL = 'Lice — The Burgers (instrumental)';

const BGM_STORAGE_KEY = 'qm-site:bgm-enabled';
const BGM_DEFAULT_VOLUME = 0.35;

export type BgmPreference = 'on' | 'off' | 'unset';

export function getBgmSourceUrl() {
  return getQdnArbitraryUrl(BGM_SERVICE, BGM_NAME, BGM_IDENTIFIER);
}

export function getBgmVolume() {
  return BGM_DEFAULT_VOLUME;
}

// localStorage can be unavailable or throw inside a sandboxed QDN app view, so every
// access is guarded — a failure here must never take the page down with it.
export function readBgmPreference(storage: Pick<Storage, 'getItem'> | null | undefined): BgmPreference {
  if (!storage) return 'unset';

  try {
    const stored = storage.getItem(BGM_STORAGE_KEY);

    if (stored === 'on' || stored === 'off') {
      return stored;
    }

    return 'unset';
  } catch {
    return 'unset';
  }
}

export function writeBgmPreference(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  preference: Exclude<BgmPreference, 'unset'>,
) {
  if (!storage) return false;

  try {
    storage.setItem(BGM_STORAGE_KEY, preference);

    return true;
  } catch {
    return false;
  }
}

/**
 * Whether playback should be attempted on load.
 *
 * An explicit stored choice always wins. With no stored choice we still attempt it: in
 * Home (Electron) autoplay is permitted and starts immediately, while browsers reject the
 * play() promise and we fall back to arming on the first user gesture. Attempting and
 * failing is harmless, so this keeps one code path for both hosts.
 */
export function shouldAttemptAutoplay(preference: BgmPreference) {
  return preference !== 'off';
}
