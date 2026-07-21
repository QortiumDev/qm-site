import { describe, expect, it } from 'vitest';
import {
  BGM_IDENTIFIER,
  getBgmButtonGlyph,
  getBgmButtonLabel,
  fetchBgmObjectUrl,
  getSafeStorage,
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

describe('button presentation', () => {
  it('distinguishes buffering from playing', () => {
    expect(getBgmButtonGlyph('loading')).toBe('…');
    expect(getBgmButtonGlyph('playing')).toBe('❚❚');
    expect(getBgmButtonGlyph('paused')).toBe('►');
    expect(getBgmButtonGlyph('loading')).not.toBe(getBgmButtonGlyph('playing'));
  });

  it('announces each state distinctly', () => {
    const labels = (['paused', 'loading', 'playing', 'unavailable'] as const).map(getBgmButtonLabel);

    expect(new Set(labels).size).toBe(4);
    expect(getBgmButtonLabel('loading')).toMatch(/loading/i);
    expect(getBgmButtonLabel('unavailable')).toMatch(/unavailable/i);
  });
});

describe('safe storage acquisition', () => {
  it('returns null instead of throwing when the property access itself throws', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'window');

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      get() {
        return {
          get localStorage(): Storage {
            throw new Error('SecurityError: DOM storage disabled');
          },
        };
      },
    });

    try {
      expect(() => getSafeStorage()).not.toThrow();
      expect(getSafeStorage()).toBeNull();
    } finally {
      if (original) Object.defineProperty(globalThis, 'window', original);
      else delete (globalThis as Record<string, unknown>).window;
    }
  });
});

describe('blob fallback', () => {
  const originalCreate = URL.createObjectURL;

  function stubObjectUrl() {
    const seen: Blob[] = [];

    URL.createObjectURL = ((blob: Blob) => {
      seen.push(blob);

      return `blob:stub/${seen.length}`;
    }) as typeof URL.createObjectURL;

    return seen;
  }

  it('rewraps the body with an explicit audio mime type', async () => {
    const seen = stubObjectUrl();

    try {
      const fetchImpl = (async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      })) as unknown as typeof fetch;

      const url = await fetchBgmObjectUrl(fetchImpl);

      expect(url).toMatch(/^blob:/);
      expect(seen).toHaveLength(1);
      expect(seen[0].type).toBe('audio/mpeg');
    } finally {
      URL.createObjectURL = originalCreate;
    }
  });

  it('rejects on a non-ok response rather than producing a broken blob', async () => {
    const seen = stubObjectUrl();

    try {
      const fetchImpl = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;

      await expect(fetchBgmObjectUrl(fetchImpl)).rejects.toThrow(/404/);
      expect(seen).toHaveLength(0);
    } finally {
      URL.createObjectURL = originalCreate;
    }
  });
});
