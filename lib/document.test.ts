import { describe, expect, it } from 'vitest';
import { findHeader } from './document';

describe('findHeader', () => {
  const headers = [
    { name: 'X-SSR-Status', value: 'HIT' },
    { name: 'set-cookie', value: 'a=1' },
    { name: 'Set-Cookie', value: 'b=2' },
  ];

  it('matches names case-insensitively', () => {
    expect(findHeader(headers, 'x-ssr-status')).toEqual(['HIT']);
  });

  it('keeps every value of a repeated header', () => {
    expect(findHeader(headers, 'set-cookie')).toEqual(['a=1', 'b=2']);
  });

  it('returns nothing for missing headers or no captured headers', () => {
    expect(findHeader(headers, 'x-ssr-request-id')).toEqual([]);
    expect(findHeader(undefined, 'x-ssr-status')).toEqual([]);
  });
});
