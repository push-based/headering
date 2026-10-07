import { EMPTY_CONFIG, type Config } from './config';

export const configItem = storage.defineItem<Config>('local:config', {
  fallback: EMPTY_CONFIG,
});
