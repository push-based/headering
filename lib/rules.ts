import type { Browser } from 'wxt/browser';
import type { Config, Header } from './config';

type Rule = Browser.declarativeNetRequest.Rule;
type ModifyHeaderInfo = Browser.declarativeNetRequest.ModifyHeaderInfo;
type HeaderOperation = Browser.declarativeNetRequest.HeaderOperation;

// The DNR enums only exist at runtime inside Chrome, so use their string
// values here to keep this module pure and testable outside the browser.
const MODIFY_HEADERS = 'modifyHeaders' as Browser.declarativeNetRequest.RuleActionType.MODIFY_HEADERS;

// Without an explicit list, DNR skips main_frame requests.
const ALL_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
] as Browser.declarativeNetRequest.ResourceType[];

function toHeaderInfo(header: Header): ModifyHeaderInfo {
  return {
    header: header.name,
    operation: header.operation as HeaderOperation,
    ...(header.value !== undefined && { value: header.value }),
  };
}

/**
 * One rule per active profile. Earlier profiles get a higher priority, so
 * they win when two profiles set the same header on the same request.
 */
export function buildRules(config: Config): Rule[] {
  const { profiles } = config;

  return profiles.flatMap((profile, index): Rule[] => {
    const { requestHeaders, responseHeaders } = profile;
    if (!profile.enabled || (!requestHeaders.length && !responseHeaders.length)) return [];

    return [
      {
        id: index + 1,
        priority: profiles.length - index,
        action: {
          type: MODIFY_HEADERS,
          ...(requestHeaders.length > 0 && { requestHeaders: requestHeaders.map(toHeaderInfo) }),
          ...(responseHeaders.length > 0 && { responseHeaders: responseHeaders.map(toHeaderInfo) }),
        },
        condition: {
          resourceTypes: ALL_RESOURCE_TYPES,
          ...(profile.domains && { requestDomains: profile.domains }),
        },
      },
    ];
  });
}
