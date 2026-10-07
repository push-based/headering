import type { Browser } from 'wxt/browser';

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
