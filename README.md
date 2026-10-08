# Headering

A Chrome extension for modifying HTTP headers and inspecting the headers of the current page, built with [WXT](https://wxt.dev), React, TypeScript, Tailwind CSS and [shadcn/ui](https://ui.shadcn.com).

Headers are applied with [`chrome.declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest) dynamic rules. Each tab's document request is observed with [`chrome.webRequest`](https://developer.chrome.com/docs/extensions/reference/api/webRequest) so the popup can show its headers.

## Configuration

Everything is driven by a JSON config that can be shared as a file. Import it from the options page (file picker, drag & drop, or paste), review the preview, then **Apply**. **Export** downloads the current config.

```json
{
  "$schema": "../config.schema.json",
  "version": 1,
  "inspect": {
    "responseHeaders": ["x-ssr-request-id", "x-ssr-status"]
  },
  "profiles": [
    {
      "name": "Staging API",
      "domains": ["api.staging.example.com"],
      "requestHeaders": [{ "name": "X-Debug", "value": "1" }],
      "responseHeaders": [{ "name": "X-Frame-Options", "operation": "remove" }]
    }
  ]
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `profiles[].enabled` | `true` | Toggled from the popup |
| `profiles[].group` | – | Profiles with the same group are mutually exclusive (shown boxed together in the popup) |
| `profiles[].domains` | all sites | Hostnames; subdomains match too |
| `*Headers[].operation` | `"set"` | `"set"` needs a `value` or `options`, `"remove"` must have neither |
| `*Headers[].options` | – | `{ "label": "value" }` presets shown as a dropdown in the popup; `value` defaults to the first |
| `inspect.requestHeaders` / `inspect.responseHeaders` | – | Header names to show in the popup for the current page's document request (the final one, after redirects). Request headers include the ones added here |
| `inspect.*Headers[].tones` | – | Write a header as `{ "name": …, "tones": { "Fresh": "success", "5xx": "error" } }` to show its value as a coloured tag: `"success"`, `"warning"` or `"error"`. Values match case-insensitively; keys like `"2xx"` match status codes, and exact values win. The card's border follows the worst tone |
| `inspect.*Headers[].badge` | – | Show one header on the toolbar icon of each tab, coloured by its tone. `true` shows ✓ for success, ⚠ for warning and ✕ for error, and untoned values as they are; an object like `{ "Failure": "!" }` shows its own text for those values instead (about 4 characters fit) |

The popup's pause button turns every profile off at once without touching their switches, so resuming restores them; the toolbar badge reads `off` while paused, and otherwise shows the `badge` header of the tab's page, if one is configured. The paused state isn't part of the config, so it isn't exported. The popup can only show requests made after the extension loaded, so reload pages that were already open. Earlier profiles win when two profiles set the same header. Unknown keys are rejected so typos surface on import. `config.schema.json` (generated with `pnpm schema`) gives editors validation and autocomplete; see `examples/`.

## Layout

- `entrypoints/background.ts` – service worker; syncs the stored config into DNR rules and records each tab's document request headers
- `entrypoints/popup/` – profile on/off toggles, pause all, and the inspected headers of the current page
- `entrypoints/options/` – import / edit / preview / export the JSON config
- `lib/config.ts` – Zod schema, parsing and serialization (source of truth for the format)
- `lib/rules.ts` – pure `config → DNR rules` mapping
- `lib/document.ts` – captured document requests (`chrome.storage.session`, per tab) and header lookup
- `lib/settings.ts` – typed `chrome.storage` items (config and paused state)
- `components/ui/` – shadcn/ui components (add more with `pnpm dlx shadcn@latest add <name>`)
- `assets/tailwind.css` – Tailwind + shadcn theme; dark mode follows the OS
- `e2e/` – Playwright tests against the built extension

## Scripts

```bash
pnpm dev        # launch Chrome with the extension loaded + HMR
pnpm compile    # type-check
pnpm test       # unit tests (Vitest + WXT fake browser)
pnpm e2e        # build, then load the extension in Chromium and check real requests (Playwright)
pnpm schema     # regenerate config.schema.json
pnpm build      # production build to .output/chrome-mv3
pnpm zip        # package for the Chrome Web Store
```

To load a build manually: `chrome://extensions` → Developer mode → **Load unpacked** → `.output/chrome-mv3`.
