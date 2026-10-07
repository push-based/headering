import type { Config, Profile } from './config';

/** Enables or disables a profile. Enabling one turns off the other profiles in its group. */
export function setProfileEnabled(config: Config, index: number, enabled: boolean): Config {
  const target = config.profiles[index];
  if (!target) return config;

  return {
    ...config,
    profiles: config.profiles.map((profile, i) => {
      if (i === index) return { ...profile, enabled };
      if (enabled && target.group !== undefined && profile.group === target.group) {
        return { ...profile, enabled: false };
      }
      return profile;
    }),
  };
}

export type ProfileEntry = { type: 'profile'; index: number } | { type: 'group'; name: string; indexes: number[] };

/** Display order: each group is gathered at the position of its first member. */
export function groupProfiles(profiles: Profile[]): ProfileEntry[] {
  const entries: ProfileEntry[] = [];
  const groups = new Map<string, number[]>();

  profiles.forEach((profile, index) => {
    if (profile.group === undefined) {
      entries.push({ type: 'profile', index });
      return;
    }
    const members = groups.get(profile.group);
    if (members) {
      members.push(index);
    } else {
      const indexes = [index];
      groups.set(profile.group, indexes);
      entries.push({ type: 'group', name: profile.group, indexes });
    }
  });

  return entries;
}
