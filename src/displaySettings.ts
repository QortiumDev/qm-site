export const ACCENT_OPTIONS = ['green', 'blue', 'orange', 'purple', 'red', 'teal', 'cyan', 'pink', 'yellow'] as const;
export const TEXT_SIZE_OPTIONS = ['extra-small', 'small', 'medium', 'large', 'extra-large', 'huge'] as const;

export type QdnTheme = 'dark' | 'light';
export type QdnAccent = (typeof ACCENT_OPTIONS)[number];
export type QdnTextSize = (typeof TEXT_SIZE_OPTIONS)[number];
export type QdnUiStyle = 'classic' | 'modern';

export type QdnDisplaySettings = {
  accent: QdnAccent;
  textSize: QdnTextSize;
  theme: QdnTheme;
  ui: QdnUiStyle;
};

type QdnHostWindow = Window & {
  _qdnAccent?: unknown;
  _qdnTextSize?: unknown;
  _qdnTheme?: unknown;
  _qdnUiStyle?: unknown;
};

const DEFAULT_DISPLAY_SETTINGS: QdnDisplaySettings = {
  accent: 'cyan',
  textSize: 'medium',
  theme: 'dark',
  ui: 'classic',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function normalizeTheme(value: unknown): QdnTheme | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();

  return normalized === 'dark' || normalized === 'light' ? normalized : null;
}

export function normalizeAccent(value: unknown): QdnAccent | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();

  return ACCENT_OPTIONS.includes(normalized as QdnAccent) ? (normalized as QdnAccent) : null;
}

export function normalizeTextSize(value: unknown): QdnTextSize | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();

  return TEXT_SIZE_OPTIONS.includes(normalized as QdnTextSize) ? (normalized as QdnTextSize) : null;
}

export function normalizeUiStyle(value: unknown): QdnUiStyle {
  if (typeof value !== 'string') return 'classic';

  return value.trim().toLowerCase() === 'modern' ? 'modern' : 'classic';
}

export function getInitialDisplaySettings(): QdnDisplaySettings {
  const hostWindow = typeof window === 'undefined' ? null : (window as QdnHostWindow);
  const query = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);

  return {
    accent:
      normalizeAccent(query?.get('accent') ?? query?.get('qdnAccent') ?? query?.get('_qdnAccent') ?? hostWindow?._qdnAccent) ??
      DEFAULT_DISPLAY_SETTINGS.accent,
    textSize:
      normalizeTextSize(
        query?.get('textSize') ??
          query?.get('text-size') ??
          query?.get('qdnTextSize') ??
          query?.get('_qdnTextSize') ??
          hostWindow?._qdnTextSize,
      ) ?? DEFAULT_DISPLAY_SETTINGS.textSize,
    theme:
      normalizeTheme(query?.get('theme') ?? query?.get('qdnTheme') ?? query?.get('_qdnTheme') ?? hostWindow?._qdnTheme) ??
      DEFAULT_DISPLAY_SETTINGS.theme,
    ui: normalizeUiStyle(query?.get('uiStyle') ?? query?.get('_qdnUiStyle') ?? hostWindow?._qdnUiStyle),
  };
}

export function applyDisplaySettings(settings: QdnDisplaySettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.dataset.accent = settings.accent;
  root.dataset.textSize = settings.textSize;
  root.dataset.theme = settings.theme;
  root.dataset.ui = settings.ui;
  root.style.colorScheme = settings.theme;
}

export function getDisplaySettingsUpdateFromMessage(
  data: unknown,
  current: QdnDisplaySettings,
): QdnDisplaySettings | null {
  if (!isRecord(data) || typeof data.action !== 'string') return null;
  if ('requestedHandler' in data && data.requestedHandler !== 'UI') return null;

  if (data.action === 'THEME_CHANGED') {
    const theme = normalizeTheme(data.theme ?? data.qdnTheme ?? data._qdnTheme);

    return theme ? { ...current, theme } : null;
  }

  if (data.action === 'ACCENT_CHANGED') {
    const accent = normalizeAccent(data.accent ?? data.qdnAccent ?? data._qdnAccent);

    return accent ? { ...current, accent } : null;
  }

  if (data.action === 'TEXT_SIZE_CHANGED') {
    const textSize = normalizeTextSize(data.textSize ?? data.qdnTextSize ?? data._qdnTextSize);

    return textSize ? { ...current, textSize } : null;
  }

  if (data.action === 'UI_STYLE_CHANGED') {
    return { ...current, ui: normalizeUiStyle(data.uiStyle ?? data._qdnUiStyle) };
  }

  if (data.action === 'DISPLAY_SETTINGS_CHANGED') {
    const next: QdnDisplaySettings = { ...current };
    let changed = false;
    const accent = normalizeAccent(data.accent ?? data.qdnAccent ?? data._qdnAccent);
    const textSize = normalizeTextSize(data.textSize ?? data.qdnTextSize ?? data._qdnTextSize);
    const theme = normalizeTheme(data.theme ?? data.qdnTheme ?? data._qdnTheme);
    const hasUiStyle = 'uiStyle' in data || '_qdnUiStyle' in data;
    const ui = hasUiStyle ? normalizeUiStyle(data.uiStyle ?? data._qdnUiStyle) : null;

    if (accent) {
      next.accent = accent;
      changed = true;
    }

    if (textSize) {
      next.textSize = textSize;
      changed = true;
    }

    if (theme) {
      next.theme = theme;
      changed = true;
    }

    if (ui && ui !== next.ui) {
      next.ui = ui;
      changed = true;
    }

    return changed ? next : null;
  }

  return null;
}
