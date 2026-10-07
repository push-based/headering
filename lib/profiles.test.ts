import { describe, expect, it } from 'vitest';
import type { Config, Profile } from './config';
import { groupProfiles, setProfileEnabled } from './profiles';

const profile = (name: string, overrides: Partial<Profile> = {}): Profile => ({
  name,
  enabled: false,
  requestHeaders: [],
  responseHeaders: [],
  ...overrides,
});

const config = (...profiles: Profile[]): Config => ({ version: 1, profiles });
const enabled = (c: Config) => c.profiles.filter((p) => p.enabled).map((p) => p.name);

describe('setProfileEnabled', () => {
  const ssr = config(
    profile('Skip cache', { enabled: true }),
    profile('SSR on', { group: 'ssr', enabled: true }),
    profile('SSR off', { group: 'ssr' }),
  );

  it('turns off the other profiles in the same group', () => {
    expect(enabled(setProfileEnabled(ssr, 2, true))).toEqual(['Skip cache', 'SSR off']);
  });

  it('leaves the group alone when disabling', () => {
    expect(enabled(setProfileEnabled(ssr, 1, false))).toEqual(['Skip cache']);
  });

  it('does not affect ungrouped profiles', () => {
    const c = config(profile('A', { enabled: true }), profile('B'));
    expect(enabled(setProfileEnabled(c, 1, true))).toEqual(['A', 'B']);
  });
});

describe('groupProfiles', () => {
  it('gathers group members at the first member position', () => {
    const c = config(profile('A', { group: 'g' }), profile('B'), profile('C', { group: 'g' }), profile('D'));

    expect(groupProfiles(c.profiles)).toEqual([
      { type: 'group', name: 'g', indexes: [0, 2] },
      { type: 'profile', index: 1 },
      { type: 'profile', index: 3 },
    ]);
  });
});
