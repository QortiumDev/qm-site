import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyDisplaySettings,
  getDisplaySettingsUpdateFromMessage,
  normalizeAccent,
  normalizeTheme,
} from './displaySettings';

describe('display settings', () => {
  beforeEach(() => {
    const documentElement = {
      dataset: {} as Record<string, string>,
      removeAttribute(attribute: string) {
        const key = attribute.replace(/^data-/, '').replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
        delete this.dataset[key];
      },
      style: {} as Record<string, string>,
    };

    vi.stubGlobal('document', { documentElement });
  });

  it('normalizes qdn theme and accent values', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('system')).toBeNull();
    expect(normalizeAccent('BLUE')).toBe('blue');
    expect(normalizeAccent('neon')).toBeNull();
  });

  it('applies settings to the root dataset', () => {
    applyDisplaySettings({ accent: 'orange', textSize: 'large', theme: 'dark' });

    expect(document.documentElement.dataset.accent).toBe('orange');
    expect(document.documentElement.dataset.textSize).toBe('large');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('accepts qdn-prefixed display setting messages', () => {
    expect(
      getDisplaySettingsUpdateFromMessage(
        { action: 'DISPLAY_SETTINGS_CHANGED', qdnAccent: 'blue', qdnTheme: 'dark', qdnTextSize: 'huge' },
        { accent: 'green', textSize: 'medium', theme: 'light' },
      ),
    ).toEqual({ accent: 'blue', textSize: 'huge', theme: 'dark' });
  });
});
