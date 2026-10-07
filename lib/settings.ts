import { EMPTY_CONFIG, type Config } from './config';

export const configItem = storage.defineItem<Config>('local:config', {
  fallback: EMPTY_CONFIG,
});

// Kept outside the config so pausing isn't exported or seen as an unsaved edit.
export const pausedItem = storage.defineItem<boolean>('local:paused', {
  fallback: false,
});
