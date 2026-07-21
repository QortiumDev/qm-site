import { getQdnArbitraryUrl } from './appCatalog';

export const BGM_SERVICE = 'AUDIO';
export const BGM_NAME = 'QuickMythril';
export const BGM_IDENTIFIER = 'qm-site-bgm';
export const BGM_TRACK_LABEL = 'Lice — The Burgers (instrumental)';

const BGM_STORAGE_KEY = 'qm-site:bgm-enabled';
const BGM_DEFAULT_VOLUME = 0.35;

export type BgmPreference = 'on' | 'off' | 'unset';
export type BgmStatus = 'paused' | 'loading' | 'playing' | 'unavailable';
export type BgmStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Reading `window.localStorage` can itself throw — an Android WebView with DOM storage
 * disabled raises SecurityError on the property access, not on getItem. Resolving it here
 * keeps that throw out of component render, where it would otherwise unmount the page.
 */
export function getSafeStorage(): BgmStorage | null {
  try {
    if (typeof window === 'undefined') return null;

    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function getBgmButtonGlyph(status: BgmStatus) {
  if (status === 'playing') return '❚❚';
  if (status === 'loading') return '…';

  return '►';
}

export function getBgmButtonLabel(status: BgmStatus) {
  if (status === 'unavailable') return `Background music unavailable — ${BGM_TRACK_LABEL}`;
  if (status === 'loading') return `Loading background music — ${BGM_TRACK_LABEL}`;
  if (status === 'playing') return `Pause background music — ${BGM_TRACK_LABEL}`;

  return `Play background music — ${BGM_TRACK_LABEL}`;
}

export function getBgmSourceUrl() {
  return getQdnArbitraryUrl(BGM_SERVICE, BGM_NAME, BGM_IDENTIFIER);
}

export function getBgmVolume() {
  return BGM_DEFAULT_VOLUME;
}

export const BGM_MIME_TYPE = 'audio/mpeg';

/**
 * Fetch the track and hand it back as a blob URL.
 *
 * The Android WebView fails to play some node render responses when the URL is given to a
 * media element directly — Qortium Home hit the same wall and fixed it the same way, by
 * buffering the body and re-wrapping it with an explicit content type. This costs the
 * whole file up front and loses range-request seeking, so it is only used as a fallback
 * after the direct source errors, keeping progressive playback everywhere it works.
 */
export async function fetchBgmObjectUrl(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(getBgmSourceUrl());

  if (!response.ok) {
    throw new Error(`Background music fetch failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  return URL.createObjectURL(new Blob([buffer], { type: BGM_MIME_TYPE }));
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
