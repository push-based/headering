import { describe, expect, it } from 'vitest';
import { findHeader, toneOf, worstTone } from './document';

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

describe('toneOf', () => {
  const status = [
    { match: 'Fresh', tone: 'success' as const },
    { match: 'Skipped', tone: 'warning' as const },
    { match: 'No answer', tone: 'error' as const },
  ];
  const code = [
    { match: '2xx', tone: 'success' as const },
    { match: '4xx', tone: 'warning' as const },
    { match: '5xx', tone: 'error' as const },
    { match: '503', tone: 'warning' as const },
  ];

  it('matches exact values case-insensitively', () => {
    expect(toneOf(status, ['fresh'])).toBe('success');
    expect(toneOf(status, ['No Answer'])).toBe('error');
  });

  it('matches status classes, with exact values taking precedence', () => {
    expect(toneOf(code, ['200'])).toBe('success');
    expect(toneOf(code, ['504'])).toBe('error');
    expect(toneOf(code, ['503'])).toBe('warning');
  });

  it('only applies status classes to three-digit codes', () => {
    expect(toneOf(code, ['2'])).toBeUndefined();
    expect(toneOf(code, ['2000'])).toBeUndefined();
    expect(toneOf(code, ['301'])).toBeUndefined();
  });

  it('takes the worst tone of repeated values', () => {
    expect(toneOf(status, ['Fresh', 'Skipped'])).toBe('warning');
  });

  it('has no tone without rules, values or a match', () => {
    expect(toneOf(undefined, ['Fresh'])).toBeUndefined();
    expect(toneOf(status, [])).toBeUndefined();
    expect(toneOf(status, ['HIT'])).toBeUndefined();
  });
});

describe('worstTone', () => {
  it('ranks error over warning over success', () => {
    expect(worstTone(['success', undefined, 'error', 'warning'])).toBe('error');
    expect(worstTone([undefined])).toBeUndefined();
  });
});
