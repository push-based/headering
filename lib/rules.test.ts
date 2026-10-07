import { describe, expect, it } from 'vitest';
import type { Config, Profile } from './config';
import { buildRules } from './rules';

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  name: 'P',
  enabled: true,
  requestHeaders: [{ name: 'X-Test', operation: 'set', value: '1' }],
  responseHeaders: [],
  ...overrides,
});

const config = (...profiles: Profile[]): Config => ({ version: 1, profiles });

describe('buildRules', () => {
  it('returns no rules for an empty config', () => {
    expect(buildRules(config())).toEqual([]);
  });

  it('skips disabled profiles and profiles without headers', () => {
    expect(buildRules(config(profile({ enabled: false }), profile({ requestHeaders: [] })))).toEqual([]);
  });

  it('applies to every resource type on all sites when no domains are given', () => {
    const [rule] = buildRules(config(profile()));

    expect(rule?.action).toEqual({
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'X-Test', operation: 'set', value: '1' }],
    });
    expect(rule?.condition.resourceTypes).toContain('main_frame');
    expect(rule?.condition.requestDomains).toBeUndefined();
  });

  it('limits the rule to the given domains', () => {
    const [rule] = buildRules(config(profile({ domains: ['api.example.com'] })));
    expect(rule?.condition.requestDomains).toEqual(['api.example.com']);
  });

  it('maps remove operations and response headers', () => {
    const [rule] = buildRules(
      config(
        profile({
          requestHeaders: [{ name: 'Cookie', operation: 'remove' }],
          responseHeaders: [{ name: 'X-Frame-Options', operation: 'remove' }],
        }),
      ),
    );

    expect(rule?.action).toEqual({
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'Cookie', operation: 'remove' }],
      responseHeaders: [{ header: 'X-Frame-Options', operation: 'remove' }],
    });
  });

  it('gives earlier profiles higher priority and unique ids', () => {
    const rules = buildRules(config(profile(), profile({ enabled: false }), profile()));

    expect(rules.map((r) => [r.id, r.priority])).toEqual([
      [1, 3],
      [3, 1],
    ]);
  });
});
