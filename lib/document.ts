import type { Browser } from 'wxt/browser';
import type { Tone, ToneRule } from './config';

export type HttpHeader = Browser.webRequest.HttpHeader;

/** A tab's latest main-frame request, captured by the background worker. */
export interface DocumentRequest {
  requestId: string;
  url: string;
  requestHeaders: HttpHeader[];
  /** Missing until the response starts. */
  statusCode?: number;
  responseHeaders?: HttpHeader[];
}

// Session storage lives in memory and is cleared when the browser closes.
export const documentRequestItem = (tabId: number) =>
  storage.defineItem<DocumentRequest>(`session:document:${tabId}`);

/** Values of a header, matched case-insensitively. Repeated headers keep every value. */
export function findHeader(headers: HttpHeader[] | undefined, name: string): string[] {
  const lower = name.toLowerCase();
  return (headers ?? []).filter((h) => h.name.toLowerCase() === lower).map((h) => h.value ?? '');
}

const STATUS_CLASS = /^[1-5]xx$/i;
const TONE_RANK: Record<Tone, number> = { success: 0, warning: 1, error: 2 };

/**
 * The tone a header's values get from its rules: an exact match (case-insensitive) wins
 * over a status class like "5xx". With several values, the worst tone wins.
 */
export function toneOf(rules: ToneRule[] | undefined, values: string[]): Tone | undefined {
  if (!rules?.length) return undefined;
  return worstTone(
    values.map((value) => {
      const v = value.trim().toLowerCase();
      const exact = rules.find((r) => !STATUS_CLASS.test(r.match) && r.match.toLowerCase() === v);
      if (exact) return exact.tone;
      if (!/^\d{3}$/.test(v)) return undefined;
      return rules.find((r) => STATUS_CLASS.test(r.match) && r.match[0] === v[0])?.tone;
    }),
  );
}

export function worstTone(tones: (Tone | undefined)[]): Tone | undefined {
  return tones.reduce<Tone | undefined>(
    (worst, tone) => (tone && (!worst || TONE_RANK[tone] > TONE_RANK[worst]) ? tone : worst),
    undefined,
  );
}
