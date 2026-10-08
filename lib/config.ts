import * as z from 'zod';

// RFC 9110 token characters.
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
// Lowercase ASCII hostname, as required by DNR requestDomains.
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;

export interface HeaderOption {
  label: string;
  value: string;
}

const HeaderName = z.string().regex(HEADER_NAME, 'Invalid header name');
const HeaderValue = z.string().refine((v) => !/[\r\n]/.test(v), 'Header value must not contain line breaks');

const Header = z
  .strictObject({
    name: HeaderName,
    operation: z.enum(['set', 'remove']).default('set'),
    value: HeaderValue.optional(),
    options: z
      .record(z.string().min(1), HeaderValue)
      .refine((o) => Object.keys(o).length > 0, 'Options must not be empty')
      .optional()
      .describe('Label → value presets, shown as a dropdown in the popup. "value" defaults to the first one.'),
  })
  .superRefine((h, ctx) => {
    if (h.operation === 'remove') {
      if (h.value !== undefined || h.options) {
        ctx.addIssue({ code: 'custom', message: '"remove" must not have a value or options', path: ['value'] });
      }
    } else if (h.value === undefined && !h.options) {
      ctx.addIssue({ code: 'custom', message: '"set" requires a value or options', path: ['value'] });
    } else if (h.value !== undefined && h.options && !Object.values(h.options).includes(h.value)) {
      ctx.addIssue({ code: 'custom', message: 'Value must be one of the options', path: ['value'] });
    }
  })
  // chrome.storage sorts object keys, so keep options as an ordered list internally.
  .transform(({ options, ...h }): typeof h & { options?: HeaderOption[] } => {
    if (!options) return h;
    const list = Object.entries(options).map(([label, value]) => ({ label, value }));
    return { ...h, value: h.value ?? list[0]?.value, options: list };
  });

const Profile = z.strictObject({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  group: z
    .string()
    .min(1)
    .optional()
    .describe('Profiles sharing a group are mutually exclusive: enabling one disables the others.'),
  domains: z
    .array(z.string().regex(DOMAIN, 'Use a lowercase hostname like "api.example.com" (no protocol or path)'))
    .min(1)
    .optional()
    .describe('Hosts (and their subdomains) to apply to. Omit to apply to all sites.'),
  requestHeaders: z.array(Header).default([]),
  responseHeaders: z.array(Header).default([]),
});

export const TONES = ['success', 'warning', 'error'] as const;
export type Tone = (typeof TONES)[number];

export interface ToneRule {
  /** An exact value (case-insensitive) or a status class like "5xx". */
  match: string;
  tone: Tone;
}

export interface BadgeLabel {
  /** An exact value, matched case-insensitively. */
  match: string;
  text: string;
}

export interface InspectHeader {
  name: string;
  tones?: ToneRule[];
  /** Shows the header on the toolbar icon: a value's label, else its tone's symbol, else the value. */
  badge?: BadgeLabel[];
}

const InspectHeader = z
  .union([
    HeaderName,
    z
      .strictObject({
        name: HeaderName,
        tones: z
          // Checked below rather than with z.enum: inside a union, a failing enum only reports "Invalid input".
          .record(z.string().min(1), z.string().meta({ enum: [...TONES] }))
          .optional()
          .describe(
            'Value → "success", "warning" or "error", shown as a coloured tag in the popup. ' +
              'Values match case-insensitively; keys like "2xx" match status codes.',
          ),
        badge: z
          .union([z.literal(true), z.record(z.string().min(1), z.string().min(1))])
          .optional()
          .describe(
            'Show the value on the toolbar icon, coloured by its tone: ✓ for success, ⚠ for warning, ✕ for error, ' +
              'and the value itself without a tone. Use an object of value → short text (about 4 characters fit) ' +
              'to show something else for known values.',
          ),
      })
      .superRefine((h, ctx) => {
        for (const [match, tone] of Object.entries(h.tones ?? {})) {
          if (!(TONES as readonly string[]).includes(tone)) {
            ctx.addIssue({ code: 'custom', message: 'Tone must be "success", "warning" or "error"', path: ['tones', match] });
          }
        }
      }),
  ])
  // chrome.storage sorts object keys, so keep tones as an ordered list internally.
  .transform((h): InspectHeader => {
    if (typeof h === 'string') return { name: h };
    return {
      name: h.name,
      ...(h.tones && { tones: Object.entries(h.tones).map(([match, tone]) => ({ match, tone: tone as Tone })) }),
      // `true` is kept as an empty list: no labels, so values show their tone's symbol.
      ...(h.badge && { badge: h.badge === true ? [] : Object.entries(h.badge).map(([match, text]) => ({ match, text })) }),
    };
  });

const Inspect = z
  .strictObject({
    requestHeaders: z.array(InspectHeader).default([]),
    responseHeaders: z.array(InspectHeader).default([]),
  })
  .superRefine((inspect, ctx) => {
    const badges = (['requestHeaders', 'responseHeaders'] as const).flatMap((list) =>
      inspect[list].flatMap((h, index) => (h.badge ? [[list, index] as const] : [])),
    );
    for (const [list, index] of badges.slice(1)) {
      ctx.addIssue({ code: 'custom', message: 'Only one header can be shown on the badge', path: [list, index, 'badge'] });
    }
  })
  .describe("Headers of the current page's document request to show in the popup.");

export const Config = z
  .strictObject({
    $schema: z.string().optional(),
    version: z.literal(1),
    inspect: Inspect.optional(),
    profiles: z.array(Profile),
  })
  .superRefine((config, ctx) => {
    const enabledGroups = new Set<string>();
    config.profiles.forEach((profile, index) => {
      if (profile.group === undefined || !profile.enabled) return;
      if (enabledGroups.has(profile.group)) {
        ctx.addIssue({
          code: 'custom',
          message: `Only one profile in group "${profile.group}" can be enabled`,
          path: ['profiles', index, 'enabled'],
        });
      }
      enabledGroups.add(profile.group);
    });
  });

export type Config = z.output<typeof Config>;
export type Profile = z.output<typeof Profile>;
export type Header = z.output<typeof Header>;
export type Inspect = z.output<typeof Inspect>;

export const EMPTY_CONFIG: Config = { version: 1, profiles: [] };

export type ParseResult = { ok: true; config: Config } | { ok: false; errors: string[] };

export function parseConfig(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: [`Invalid JSON: ${(err as Error).message}`] };
  }

  const result = Config.safeParse(json);
  if (result.success) return { ok: true, config: result.data };

  return {
    ok: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    ),
  };
}

/**
 * Inverse of parsing: writes the file format with keys in a stable order
 * (stored configs come back from chrome.storage with sorted keys) and
 * defaults omitted.
 */
export function serializeConfig(config: Config): string {
  const { inspect } = config;
  const json = {
    ...(config.$schema !== undefined && { $schema: config.$schema }),
    version: config.version,
    ...(inspect &&
      (inspect.requestHeaders.length > 0 || inspect.responseHeaders.length > 0) && {
        inspect: {
          ...(inspect.requestHeaders.length > 0 && { requestHeaders: inspect.requestHeaders.map(inspectHeaderToJson) }),
          ...(inspect.responseHeaders.length > 0 && { responseHeaders: inspect.responseHeaders.map(inspectHeaderToJson) }),
        },
      }),
    profiles: config.profiles.map((profile) => ({
      name: profile.name,
      enabled: profile.enabled,
      ...(profile.group !== undefined && { group: profile.group }),
      ...(profile.domains && { domains: profile.domains }),
      ...(profile.requestHeaders.length > 0 && { requestHeaders: profile.requestHeaders.map(headerToJson) }),
      ...(profile.responseHeaders.length > 0 && { responseHeaders: profile.responseHeaders.map(headerToJson) }),
    })),
  };
  return JSON.stringify(json, null, 2) + '\n';
}

function headerToJson(header: Header) {
  return {
    name: header.name,
    ...(header.operation !== 'set' && { operation: header.operation }),
    ...(header.value !== undefined && { value: header.value }),
    ...(header.options && { options: Object.fromEntries(header.options.map((o) => [o.label, o.value])) }),
  };
}

/** Plain names stay plain; only headers with tones or a badge need the object form. */
function inspectHeaderToJson(header: InspectHeader) {
  if (!header.tones && !header.badge) return header.name;
  return {
    name: header.name,
    ...(header.tones && { tones: Object.fromEntries(header.tones.map((t) => [t.match, t.tone])) }),
    ...(header.badge && {
      badge: header.badge.length ? Object.fromEntries(header.badge.map((b) => [b.match, b.text])) : true,
    }),
  };
}
