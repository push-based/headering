import type { Config } from '@/lib/config';
import { buildRules } from '@/lib/rules';
import { configItem } from '@/lib/settings';

async function applyConfig(config: Config) {
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const addRules = buildRules(config);
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules,
  });
  await browser.action.setBadgeText({ text: addRules.length ? String(addRules.length) : '' });
}

export default defineBackground(() => {
  // Chain updates so a quick sequence of changes can't interleave.
  let queue = Promise.resolve();
  const sync = (config: Config) => {
    queue = queue
      .then(() => applyConfig(config))
      .catch((err) => console.error('Failed to apply header rules', err));
  };

  configItem.watch(sync);

  // Dynamic rules persist across restarts; resync after install/update.
  browser.runtime.onInstalled.addListener(async () => sync(await configItem.getValue()));
});
