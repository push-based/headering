import { describe, expect, it } from 'vitest';
import { parseConfig, serializeConfig } from './config';

const parse = (value: unknown) => parseConfig(JSON.stringify(value));

// Mimics chrome.storage, which hands objects back with their keys sorted.
const sortKeysDeep = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(sortKeysDeep)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .toSorted(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, sortKeysDeep(v)]),
        )
      : value;

describe('parseConfig', () => {
  it('applies defaults', () => {
    const result = parse({
      version: 1,
      profiles: [{ name: 'Debug', requestHeaders: [{ name: 'X-Debug', value: '1' }] }],
    });

    expect(result).toEqual({
      ok: true,
      config: {
        version: 1,
        profiles: [
          {
            name: 'Debug',
            enabled: true,
            requestHeaders: [{ name: 'X-Debug', operation: 'set', value: '1' }],
            responseHeaders: [],
          },
        ],
      },
    });
  });

  it('accepts a $schema reference', () => {
    expect(parse({ $schema: './config.schema.json', version: 1, profiles: [] }).ok).toBe(true);
  });

  it('reports invalid JSON', () => {
    const result = parseConfig('{ nope');
    expect(result).toEqual({ ok: false, errors: [expect.stringMatching(/^Invalid JSON/)] });
  });

  it('reports errors with their path', () => {
    const result = parse({
      version: 1,
      profiles: [{ name: 'Bad', domains: ['https://example.com'], requestHeaders: [{ name: 'X Bad', value: '1' }] }],
    });

    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        expect.stringMatching(/^profiles\.0\.domains\.0: /),
        'profiles.0.requestHeaders.0.name: Invalid header name',
      ]),
    });
  });

  it('rejects unknown keys so typos are caught', () => {
    expect(parse({ version: 1, profiles: [{ name: 'Typo', requestHeader: [] }] }).ok).toBe(false);
  });

  it('rejects unsupported versions', () => {
    expect(parse({ version: 2, profiles: [] }).ok).toBe(false);
  });

  it.each([
    [{ name: 'X-A' }, 'set without value'],
    [{ name: 'X-A', operation: 'remove', value: '1' }, 'remove with value'],
    [{ name: 'X-A', value: 'a\r\nInjected: 1' }, 'value with line breaks'],
  ])('rejects header %j (%s)', (header, _reason) => {
    expect(parse({ version: 1, profiles: [{ name: 'P', requestHeaders: [header] }] }).ok).toBe(false);
  });

  describe('header options', () => {
    const withHeader = (header: object) => parse({ version: 1, profiles: [{ name: 'P', requestHeaders: [header] }] });
    const options = { BR: '1.178.47.255', GB: '2.127.255.255' };

    it('defaults the value to the first option', () => {
      const result = withHeader({ name: 'x-forwarded-for', options });
      expect(result.ok && result.config.profiles[0]?.requestHeaders[0]).toEqual({
        name: 'x-forwarded-for',
        operation: 'set',
        value: '1.178.47.255',
        options: [
          { label: 'BR', value: '1.178.47.255' },
          { label: 'GB', value: '2.127.255.255' },
        ],
      });
    });

    it('keeps option order and exports in file order after chrome.storage sorts keys', () => {
      const unsorted = { ZZ: '1.1.1.1', AA: '2.2.2.2' };
      const result = withHeader({ name: 'x-forwarded-for', options: unsorted });
      if (!result.ok) throw new Error('expected valid config');

      const stored = sortKeysDeep(result.config) as typeof result.config;
      expect(stored.profiles[0]?.requestHeaders[0]?.options?.map((o) => o.label)).toEqual(['ZZ', 'AA']);
      expect(serializeConfig(stored)).toBe(serializeConfig(result.config));
      expect(JSON.parse(serializeConfig(stored)).profiles[0]).toEqual({
        name: 'P',
        enabled: true,
        requestHeaders: [{ name: 'x-forwarded-for', value: '1.1.1.1', options: unsorted }],
      });
    });

    it('keeps an explicit value that is one of the options', () => {
      const result = withHeader({ name: 'x-forwarded-for', value: '2.127.255.255', options });
      expect(result.ok && result.config.profiles[0]?.requestHeaders[0]?.value).toBe('2.127.255.255');
    });

    it.each([
      [{ name: 'x-forwarded-for', value: '9.9.9.9', options }, 'value not in options'],
      [{ name: 'x-forwarded-for', options: {} }, 'empty options'],
      [{ name: 'x-forwarded-for', operation: 'remove', options }, 'remove with options'],
    ])('rejects %j (%s)', (header, _reason) => {
      expect(withHeader(header).ok).toBe(false);
    });
  });

  describe('groups', () => {
    const grouped = (aEnabled: boolean, bEnabled: boolean) =>
      parse({
        version: 1,
        profiles: [
          { name: 'A', group: 'ssr', enabled: aEnabled },
          { name: 'B', group: 'ssr', enabled: bEnabled },
        ],
      });

    it('allows at most one enabled profile per group', () => {
      expect(grouped(true, false).ok).toBe(true);
      expect(grouped(false, false).ok).toBe(true);
      expect(grouped(true, true)).toEqual({
        ok: false,
        errors: ['profiles.1.enabled: Only one profile in group "ssr" can be enabled'],
      });
    });

    it('round-trips the group through serializeConfig', () => {
      const result = grouped(true, false);
      if (!result.ok) throw new Error('expected valid config');
      expect(JSON.parse(serializeConfig(result.config)).profiles[0]).toEqual({ name: 'A', enabled: true, group: 'ssr' });
    });
  });

  describe('inspect', () => {
    it('defaults missing lists and round-trips through serializeConfig', () => {
      const result = parse({ version: 1, inspect: { responseHeaders: ['x-ssr-status'] }, profiles: [] });
      if (!result.ok) throw new Error('expected valid config');

      expect(result.config.inspect).toEqual({ requestHeaders: [], responseHeaders: [{ name: 'x-ssr-status' }] });
      expect(JSON.parse(serializeConfig(result.config))).toEqual({
        version: 1,
        inspect: { responseHeaders: ['x-ssr-status'] },
        profiles: [],
      });
    });

    it('omits an empty inspect block when serializing', () => {
      const result = parse({ version: 1, inspect: {}, profiles: [] });
      if (!result.ok) throw new Error('expected valid config');
      expect(JSON.parse(serializeConfig(result.config))).not.toHaveProperty('inspect');
    });

    it('rejects invalid header names', () => {
      expect(parse({ version: 1, inspect: { responseHeaders: ['x ssr'] }, profiles: [] })).toEqual({
        ok: false,
        errors: ['inspect.responseHeaders.0: Invalid header name'],
      });
    });

    it('keeps tones in file order, even after chrome.storage sorts their keys', () => {
      const tones = { Fresh: 'success', Skipped: 'warning', 'No answer': 'error' };
      const result = parse({
        version: 1,
        inspect: { responseHeaders: ['x-ssr-request-id', { name: 'x-ssr-status', tones }] },
        profiles: [],
      });
      if (!result.ok) throw new Error('expected valid config');

      expect(result.config.inspect?.responseHeaders[1]).toEqual({
        name: 'x-ssr-status',
        tones: [
          { match: 'Fresh', tone: 'success' },
          { match: 'Skipped', tone: 'warning' },
          { match: 'No answer', tone: 'error' },
        ],
      });

      const stored = sortKeysDeep(result.config) as typeof result.config;
      const json = JSON.parse(serializeConfig(stored));
      expect(json.inspect.responseHeaders).toEqual(['x-ssr-request-id', { name: 'x-ssr-status', tones }]);
      expect(Object.keys(json.inspect.responseHeaders[1].tones)).toEqual(['Fresh', 'Skipped', 'No answer']);
    });

    it('keeps badge labels in file order, and `true` as no labels', () => {
      const badge = { Fresh: 'OK', 'No answer': 'ERR' };
      const result = parse({
        version: 1,
        inspect: { responseHeaders: [{ name: 'x-ssr-status', badge }, { name: 'x-ssr-status-code', tones: { '5xx': 'error' } }] },
        profiles: [],
      });
      if (!result.ok) throw new Error('expected valid config');
      expect(result.config.inspect?.responseHeaders[0]?.badge).toEqual([
        { match: 'Fresh', text: 'OK' },
        { match: 'No answer', text: 'ERR' },
      ]);

      const json = JSON.parse(serializeConfig(sortKeysDeep(result.config) as typeof result.config));
      expect(json.inspect.responseHeaders[0]).toEqual({ name: 'x-ssr-status', badge });

      const plain = parse({ version: 1, inspect: { responseHeaders: [{ name: 'x-ssr-status', badge: true }] }, profiles: [] });
      if (!plain.ok) throw new Error('expected valid config');
      expect(plain.config.inspect?.responseHeaders[0]).toEqual({ name: 'x-ssr-status', badge: [] });
      expect(JSON.parse(serializeConfig(plain.config)).inspect.responseHeaders[0]).toEqual({ name: 'x-ssr-status', badge: true });
    });

    it('allows only one badge header', () => {
      expect(
        parse({
          version: 1,
          inspect: {
            requestHeaders: [{ name: 'x-ssr-skip-cache', badge: true }],
            responseHeaders: [{ name: 'x-ssr-status', badge: true }],
          },
          profiles: [],
        }),
      ).toEqual({ ok: false, errors: ['inspect.responseHeaders.0.badge: Only one header can be shown on the badge'] });
    });

    it('rejects unknown tones and keys', () => {
      expect(
        parse({ version: 1, inspect: { responseHeaders: [{ name: 'x-ssr-status', tones: { Fresh: 'green' } }] }, profiles: [] }),
      ).toEqual({
        ok: false,
        errors: ['inspect.responseHeaders.0.tones.Fresh: Tone must be "success", "warning" or "error"'],
      });
      expect(parse({ version: 1, inspect: { responseHeaders: [{ name: 'x-ssr-status', tone: {} }] }, profiles: [] })).toEqual({
        ok: false,
        errors: ['inspect.responseHeaders.0: Unrecognized key: "tone"'],
      });
    });
  });

  it('round-trips through serializeConfig', () => {
    const first = parse({ version: 1, profiles: [{ name: 'P', domains: ['example.com'] }] });
    if (!first.ok) throw new Error('expected valid config');
    expect(parseConfig(serializeConfig(first.config))).toEqual(first);
  });
});
