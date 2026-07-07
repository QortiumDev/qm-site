import type { PriorityItem, WorkLogEntry } from './workbenchData';

export type WorkbenchDataSource = 'qdn' | 'fallback';

const textDecoder = new TextDecoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function firstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function collectionFromPayload(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of keys) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function decodeBase64(value: string) {
  try {
    if (typeof globalThis.atob !== 'function') {
      return value;
    }

    const binary = globalThis.atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return textDecoder.decode(bytes);
  } catch {
    return value;
  }
}

function unwrapQdnPayload(value: unknown): unknown {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return textDecoder.decode(value);
  }

  if (ArrayBuffer.isView(value)) {
    return textDecoder.decode(value);
  }

  if (!isRecord(value)) {
    return value;
  }

  if (typeof value.data64 === 'string') {
    return decodeBase64(value.data64);
  }

  for (const key of ['data', 'body', 'content', 'text', 'result']) {
    if (value[key] !== undefined && value[key] !== null) {
      return unwrapQdnPayload(value[key]);
    }
  }

  return value;
}

export function extractQdnJsonPayload(value: unknown) {
  const payload = unwrapQdnPayload(value);

  if (typeof payload === 'string') {
    const trimmed = payload.trim();

    if (!trimmed) {
      throw new Error('QDN JSON resource was empty.');
    }

    return JSON.parse(trimmed) as unknown;
  }

  return payload;
}

function normalizeState(value: string): PriorityItem['state'] {
  const state = value.toLowerCase();

  if (['active', 'current', 'doing', 'in-progress', 'now', 'wip'].includes(state)) {
    return 'active';
  }

  if (['next', 'soon', 'queued', 'ready'].includes(state)) {
    return 'next';
  }

  return 'later';
}

function normalizeSignal(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

export function normalizePriorityItems(payload: unknown): PriorityItem[] {
  return collectionFromPayload(payload, ['items', 'priorities', 'priorityItems'])
    .map((item, index): PriorityItem | null => {
      if (!isRecord(item)) {
        return null;
      }

      const title = firstString(item, ['title', 'name', 'label']);

      if (!title) {
        return null;
      }

      return {
        id: firstString(item, ['id', 'key', 'slug']) || `qdn-priority-${index + 1}`,
        area: firstString(item, ['area', 'category', 'project']) || 'Qortium',
        title,
        state: normalizeState(firstString(item, ['state', 'status', 'phase'])),
        signal: normalizeSignal(firstNumber(item, ['signal', 'score', 'votes', 'priority'])),
        summary: firstString(item, ['summary', 'description', 'body']) || title,
      };
    })
    .filter((item): item is PriorityItem => Boolean(item));
}

function normalizeDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parsed = Date.parse(value);

  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return 'Undated';
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())).map((tag) => tag.trim());
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeWorkLogEntries(payload: unknown): WorkLogEntry[] {
  return collectionFromPayload(payload, ['entries', 'items', 'workLog'])
    .map((item): WorkLogEntry | null => {
      if (!isRecord(item)) {
        return null;
      }

      const title = firstString(item, ['title', 'name', 'label']);

      if (!title) {
        return null;
      }

      return {
        date: normalizeDate(firstString(item, ['date', 'created', 'updated']) || 'Undated'),
        project: firstString(item, ['project', 'repo', 'area']) || 'Qortium',
        title,
        summary: firstString(item, ['summary', 'description', 'body']) || title,
        tags: normalizeTags(item.tags),
      };
    })
    .filter((item): item is WorkLogEntry => Boolean(item));
}
