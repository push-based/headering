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
            .sort(([a], [b]) => a.localeCompare(b))
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
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/^Invalid JSON/);
  });

  it('reports errors with their path', () => {
    const result = parse({
      version: 1,
      profiles: [{ name: 'Bad', domains: ['https://example.com'], requestHeaders: [{ name: 'X Bad', value: '1' }] }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.stringMatching(/^profiles\.0\.domains\.0: /));
      expect(result.errors).toContainEqual('profiles.0.requestHeaders.0.name: Invalid header name');
    }
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

  it('round-trips through serializeConfig', () => {
    const first = parse({ version: 1, profiles: [{ name: 'P', domains: ['example.com'] }] });
    if (!first.ok) throw new Error('expected valid config');
    expect(parseConfig(serializeConfig(first.config))).toEqual(first);
  });
});
