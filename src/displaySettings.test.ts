import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyDisplaySettings,
  getDisplaySettingsUpdateFromMessage,
  getInitialDisplaySettings,
  normalizeAccent,
  normalizeTheme,
  normalizeUiStyle,
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

    vi.unstubAllGlobals();
    vi.stubGlobal('document', { documentElement });
  });

  it('normalizes qdn theme and accent values', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('system')).toBeNull();
    expect(normalizeAccent('BLUE')).toBe('blue');
    expect(normalizeAccent('neon')).toBeNull();
    expect(normalizeUiStyle('modern')).toBe('modern');
    expect(normalizeUiStyle(' modern ')).toBe('modern');
    expect(normalizeUiStyle('Modern')).toBe('modern');
    expect(normalizeUiStyle('fun')).toBe('fun');
    expect(normalizeUiStyle(' fun ')).toBe('fun');
    expect(normalizeUiStyle('future')).toBe('classic');
    expect(normalizeUiStyle(undefined)).toBe('classic');
  });

  it('applies settings to the root dataset', () => {
    applyDisplaySettings({ accent: 'orange', textSize: 'large', theme: 'dark', ui: 'modern' });

    expect(document.documentElement.dataset.accent).toBe('orange');
    expect(document.documentElement.dataset.textSize).toBe('large');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.ui).toBe('modern');
  });

  it('reads ui style from query params and defaults unknown values to classic', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?uiStyle=modern',
      },
    });

    expect(getInitialDisplaySettings().ui).toBe('modern');

    vi.stubGlobal('window', {
      location: {
        search: '?uiStyle=fun',
      },
    });

    expect(getInitialDisplaySettings().ui).toBe('fun');

    vi.stubGlobal('window', {
      location: {
        search: '?_qdnUiStyle=future',
      },
    });

    expect(getInitialDisplaySettings().ui).toBe('classic');
  });

  it('reads ui style from host globals', () => {
    vi.stubGlobal('window', {
      _qdnUiStyle: 'modern',
      location: {
        search: '',
      },
    });

    expect(getInitialDisplaySettings().ui).toBe('modern');
  });

  it('accepts qdn-prefixed display setting messages', () => {
    expect(
      getDisplaySettingsUpdateFromMessage(
        { action: 'DISPLAY_SETTINGS_CHANGED', qdnAccent: 'blue', qdnTheme: 'dark', qdnTextSize: 'huge', uiStyle: 'modern' },
        { accent: 'green', textSize: 'medium', theme: 'light', ui: 'classic' },
      ),
    ).toEqual({ accent: 'blue', textSize: 'huge', theme: 'dark', ui: 'modern' });
  });

  it('accepts ui style messages through the UI handler', () => {
    expect(
      getDisplaySettingsUpdateFromMessage(
        { action: 'UI_STYLE_CHANGED', requestedHandler: 'UI', uiStyle: 'modern' },
        { accent: 'green', textSize: 'medium', theme: 'light', ui: 'classic' },
      ),
    ).toEqual({ accent: 'green', textSize: 'medium', theme: 'light', ui: 'modern' });

    expect(
      getDisplaySettingsUpdateFromMessage(
        { action: 'UI_STYLE_CHANGED', requestedHandler: 'UI', uiStyle: 'fun' },
        { accent: 'green', textSize: 'medium', theme: 'light', ui: 'modern' },
      ),
    ).toEqual({ accent: 'green', textSize: 'medium', theme: 'light', ui: 'fun' });

    expect(
      getDisplaySettingsUpdateFromMessage(
        { action: 'UI_STYLE_CHANGED', requestedHandler: 'OTHER', uiStyle: 'modern' },
        { accent: 'green', textSize: 'medium', theme: 'light', ui: 'classic' },
      ),
    ).toBeNull();
  });
});
