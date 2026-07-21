import { describe, expect, it } from 'vitest';
import {
  BGM_IDENTIFIER,
  BGM_NAME,
  BGM_SERVICE,
  getBgmSourceUrl,
  getBgmVolume,
  readBgmPreference,
  shouldAttemptAutoplay,
  writeBgmPreference,
} from './backgroundMusic';

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    read: (key: string) => data.get(key) ?? null,
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error('storage blocked');
  },
  setItem: () => {
    throw new Error('storage blocked');
  },
};

describe('background music resource', () => {
  it('points at the separately published AUDIO resource', () => {
    const url = getBgmSourceUrl();

    expect(BGM_SERVICE).toBe('AUDIO');
    expect(url).toContain(`/arbitrary/${BGM_SERVICE}/${BGM_NAME}/${BGM_IDENTIFIER}`);
    expect(url).not.toContain('/render/');
  });

  it('keeps the default volume in a background-music range', () => {
    expect(getBgmVolume()).toBeGreaterThan(0);
    expect(getBgmVolume()).toBeLessThan(0.6);
  });
});

describe('preference storage', () => {
  it('returns unset when nothing is stored', () => {
    expect(readBgmPreference(makeStorage())).toBe('unset');
  });

  it('round-trips an explicit choice', () => {
    const storage = makeStorage();

    expect(writeBgmPreference(storage, 'off')).toBe(true);
    expect(readBgmPreference(storage)).toBe('off');

    writeBgmPreference(storage, 'on');
    expect(readBgmPreference(storage)).toBe('on');
  });

  it('ignores unrecognised stored values', () => {
    expect(readBgmPreference(makeStorage({ 'qm-site:bgm-enabled': 'maybe' }))).toBe('unset');
  });

  it('survives storage being unavailable or throwing', () => {
    expect(readBgmPreference(null)).toBe('unset');
    expect(readBgmPreference(throwingStorage)).toBe('unset');
    expect(writeBgmPreference(null, 'on')).toBe(false);
    expect(writeBgmPreference(throwingStorage, 'on')).toBe(false);
  });
});

describe('autoplay decision', () => {
  it('attempts playback by default and after opting in', () => {
    expect(shouldAttemptAutoplay('unset')).toBe(true);
    expect(shouldAttemptAutoplay('on')).toBe(true);
  });

  it('respects an explicit opt-out', () => {
    expect(shouldAttemptAutoplay('off')).toBe(false);
  });
});
