# Headering

A Chrome extension that modifies HTTP request and response headers and shows you the headers of the page you're on, all driven by a JSON config you can share with your team.

Headering is for the moment when you need to send `x-debug: 1` to staging, switch a header between a handful of preset values, or check at a glance whether the page you're looking at was served from cache. You describe that once in a config file, and from then on it's a toggle in the toolbar popup.

## Features

- **Header profiles.** Set or remove request and response headers, either everywhere or only on specific domains. Turn each profile on or off from the popup.
- **Presets.** Give a header a set of labelled values and pick one from a dropdown in the popup, for example a country for `x-forwarded-for`.
- **Mutually exclusive groups.** Put profiles in a group and turning one on turns the others off, so you can never send `x-ssr-enabled` and `x-ssr-disabled` together.
- **Page header inspection.** The popup shows the headers you care about from the current page's document request, after redirects. Colour-code values as success, warning or error.
- **Toolbar badge.** Show one header on each tab's toolbar icon, so a failed render or a cache miss is visible without opening anything.
- **Pause all.** Turn every profile off at once and get the same set back when you resume.
- **Reload as a new visitor.** Clear the site's cookies, storage, caches and service workers, then reload.
- **Shareable config.** Import and export a single JSON file. A JSON Schema gives you validation and autocomplete in your editor, and the extension rejects typos and unknown keys when you import.

## Install

Build the extension from source:

```bash
git clone https://github.com/push-based/headering.git
cd headering
pnpm install
pnpm build
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select `dist/chrome-mv3`.

## Quick start

1. Right-click the Headering icon and choose **Options**.
2. Import a config with the file picker, by dragging and dropping, or by pasting. Try [`examples/staging.json`](examples/staging.json) or [`examples/headers.json`](examples/headers.json).
3. Check the preview, then click **Apply**.
4. Open the popup from the toolbar to switch profiles on and off.

Reload any tabs that were open before you installed the extension. The popup can only show headers for requests made after the extension loaded.

## Configuration

A config has a list of `profiles` that change headers and an optional `inspect` section that chooses which headers the popup shows:

```json
{
  "$schema": "https://raw.githubusercontent.com/push-based/headering/main/config.schema.json",
  "version": 1,
  "inspect": {
    "responseHeaders": [
      "x-request-id",
      {
        "name": "x-cache",
        "tones": { "HIT": "success", "MISS": "warning" },
        "badge": true
      }
    ]
  },
  "profiles": [
    {
      "name": "Staging API",
      "domains": ["api.staging.example.com"],
      "requestHeaders": [{ "name": "X-Debug", "value": "1" }],
      "responseHeaders": [{ "name": "X-Frame-Options", "operation": "remove" }]
    },
    {
      "name": "Client country",
      "enabled": false,
      "requestHeaders": [
        {
          "name": "x-forwarded-for",
          "options": { "DE": "101.46.227.25", "GB": "2.127.255.255", "US-NY": "129.21.1.40" }
        }
      ]
    }
  ]
}
```

### Profiles

| Field | Default | Description |
| --- | --- | --- |
| `name` | required | Shown in the popup. |
| `enabled` | `true` | Whether the profile starts on. You can toggle it from the popup. |
| `group` | none | Only one profile in a group can be on at a time. The popup shows groups together. |
| `domains` | all sites | Lowercase hostnames, such as `api.example.com`. Subdomains match too. |
| `requestHeaders` / `responseHeaders` | `[]` | The headers to change. See below. |

Each header in `requestHeaders` or `responseHeaders` has these fields:

| Field | Default | Description |
| --- | --- | --- |
| `name` | required | The header name. |
| `operation` | `"set"` | `"set"` needs a `value` or `options`. `"remove"` must have neither. |
| `value` | first option | The value to send. If `options` is present, it has to be one of them. |
| `options` | none | `{ "label": "value" }` presets, shown as a dropdown in the popup. |

When two enabled profiles set the same header, the one that comes first in the list wins.

### Inspect

`inspect.requestHeaders` and `inspect.responseHeaders` list the headers of the current page's document request that the popup should show. That's the final request after any redirects. Request headers include the ones Headering added.

An entry can be a header name or an object:

| Field | Description |
| --- | --- |
| `name` | The header name. |
| `tones` | Maps values to `"success"`, `"warning"` or `"error"` so they show as a coloured tag. Matching ignores case. Keys like `"2xx"` or `"5xx"` match status codes, and an exact value wins over a status class. The card's border takes the colour of the worst tone. |
| `badge` | Shows this header on the toolbar icon, coloured by its tone. `true` shows ✓ for success, ⚠ for warning and ✕ for error, and shows untoned values as they are. An object like `{ "Failure": "!" }` sets your own text for specific values. About 4 characters fit. Only one header can have a badge. |

### Editor support

[`config.schema.json`](config.schema.json) is generated from the same Zod schema the extension validates against. Point `$schema` at it to get autocomplete and inline errors in VS Code, WebStorm and other editors that support JSON Schema.

## The popup

- **Profile switches** turn individual profiles on and off. Profiles with `options` get a dropdown.
- **Pause** turns every profile off without changing their switches, so resuming puts back the set you had. The badge shows `off` while Headering is paused. The paused state isn't saved in the config, so exporting doesn't include it.
- **Reload as a new visitor** clears the current site's cookies, local and session storage, IndexedDB, Cache Storage, HTTP cache and service workers, then reloads the page while skipping the cache. It clears only the page's origin, but Chrome removes cookies for the whole registrable domain. That means clearing `app.example.com` also removes `example.com` cookies, including any login that uses them.
- **Inspected headers** show the values from the current page, coloured by their tones.

## How it works

Headering turns the config into [`chrome.declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest) dynamic rules, so Chrome changes the headers itself and no extension code runs on the request path. To show headers in the popup, the background service worker watches each tab's top-level document request with [`chrome.webRequest`](https://developer.chrome.com/docs/extensions/reference/api/webRequest) and keeps the result in session storage.

### Permissions

| Permission | Why |
| --- | --- |
| `declarativeNetRequest` | Applies the header rules. |
| `webRequest` | Reads the headers of each tab's document request for the popup and badge. |
| `<all_urls>` host access | Header rules and `webRequest` only work on hosts the extension has access to. |
| `storage` | Stores the config and the paused state. |
| `browsingData`, `scripting` | Clear a site's data for **Reload as a new visitor**. |

Headering makes no network requests of its own and doesn't collect any data.

## Development

You need Node.js 22.18 or newer and [pnpm](https://pnpm.io).

```bash
pnpm dev        # launch Chrome with the extension loaded and hot reload
pnpm compile    # type-check
pnpm test       # unit tests (Vitest with the WXT fake browser)
pnpm e2e        # build, then load the extension in Chromium and check real requests (Playwright)
pnpm schema     # regenerate config.schema.json
pnpm build      # production build to dist/chrome-mv3
pnpm zip        # package for the Chrome Web Store
```

The extension is built with [WXT](https://wxt.dev), React, TypeScript, Tailwind CSS and [shadcn/ui](https://ui.shadcn.com).

### Project layout

| Path | Contents |
| --- | --- |
| `entrypoints/background.ts` | Service worker. Syncs the stored config into DNR rules and records each tab's document request headers. |
| `entrypoints/popup/` | Profile toggles, pause, reload as a new visitor, and the inspected headers. |
| `entrypoints/options/` | Import, edit, preview and export the config. |
| `lib/config.ts` | Zod schema, parsing and serialisation. This is the source of truth for the config format. |
| `lib/rules.ts` | Pure mapping from a config to DNR rules. |
| `lib/document.ts` | Captured document requests, stored per tab in `chrome.storage.session`, and header lookup. |
| `lib/site.ts` | Clearing a site's data. |
| `lib/settings.ts` | Typed `chrome.storage` items for the config and the paused state. |
| `components/ui/` | shadcn/ui components. Add more with `pnpm dlx shadcn@latest add <name>`. |
| `assets/tailwind.css` | Tailwind and the shadcn theme. Dark mode follows the OS. |
| `examples/` | Example configs. |
| `e2e/` | Playwright tests against the built extension. |

If you change the config format in `lib/config.ts`, run `pnpm schema` and commit the updated `config.schema.json`.

## Contributing

Bug reports, ideas and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## License

[MIT](LICENSE)
