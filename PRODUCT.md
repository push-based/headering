# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences share one tool:

- **Web developers debugging environments.** Front-end and performance engineers who need to send a debug flag to staging, switch SSR on or off, fake a client country, or see at a glance whether the page in front of them was a cache hit or a failed render.
- **Teammates who only use the popup.** QA, support and product people who import a config an engineer wrote and then just flip toggles and read the inspected headers. They should never need to touch JSON.
- **push-based consultants and their client teams.** They share configs during engagements, so one team ends up with one file and everyone gets the same switches.

## Product Purpose

Headering is a Chrome extension (Manifest V3) for changing and inspecting HTTP headers. You describe the headers once in a JSON config you can share. From then on each change is a switch, a dropdown or a coloured tag in the toolbar popup. It works when the popup is a quick, reliable control over the request, and when anyone on the team can read the state of the current page without opening DevTools.

## Positioning

The config is the product. One schema-validated JSON file, with editor autocomplete through JSON Schema and strict validation on import, defines profiles, presets, mutually exclusive groups and which headers to inspect, so a whole team can share the setup. Chrome applies the header changes itself through `declarativeNetRequest`. No extension code runs on the request path, and the extension makes no network requests of its own.

## Operating Context

- **Toolbar popup** (`entrypoints/popup/`): profile switches, preset dropdowns, grouped profiles, pause and resume, inspected headers for the current tab's document request (after redirects), and the optional clear-site-data actions.
- **Toolbar badge:** one header's value or tone per tab, so a problem shows up without opening anything.
- **Options page** (`entrypoints/options/`): import a config by file picker, drag and drop or paste, edit it in a JSON editor beside a live preview of the popup, apply it, and export it.
- Used during day-to-day debugging and QA on staging and production sites, in normal and Incognito windows.

## Capabilities and Constraints

- Header profiles that set or remove request and response headers, globally or for specific domains.
- Presets (labelled values in a dropdown) and mutually exclusive groups.
- Inspected headers with `success` / `warning` / `error` tones and status-class matching (`2xx`, `5xx`).
- A pause that keeps the switch states, so resuming restores them.
- "Clear site data" and "Reload as a new visitor": opt-in through `clearSiteData` in the config, and both work the way DevTools' Clear site data does.
- Built with WXT, React 19, TypeScript, Tailwind CSS v4 and shadcn/ui, with the Geist font.
- Popup space is limited (the README screenshots show it at about 360px wide), so density and scanning matter.
- The Zod schema in `lib/config.ts` is the source of truth for the config format. `config.schema.json` is generated from it.

## Brand Commitments

- Name: **Headering**. Icon: `assets/icon.svg`.
- UI work must follow push-based's internal design guide. Maintainers keep a local, gitignored copy of its tokens and rules, plus the current gaps, at `.impeccable/design-guide.md`. The live guide wins if they differ.
- Copy follows the guide's voice: clear, confident, human and inclusive. Error messages are helpful and say what to try next. Success messages are brief.
- Light and dark themes both follow the OS and are both first-class.
- Voice (from the README): plain, direct and concrete. It names the exact header, value and action, without marketing language.

## Evidence on Hand

- README screenshots of the popup and options page in light and dark: `docs/images/popup-{light,dark}.png`, `docs/images/options-{light,dark}.png`.
- Example configs: `examples/staging.json`, `examples/headers.json`.
- No user testimonials, usage numbers, ratings or Chrome Web Store listing exist yet, so don't make any up.

## Product Principles

1. **The popup is a control panel, not a dashboard.** You should be able to see the state and change it in seconds.
2. **The config is shareable and trustworthy.** Strict validation and clear errors beat being lenient. What you import is exactly what runs.
3. **Show the request's truth.** Inspected headers reflect the real final document request, and tones make problems obvious at a glance.
4. **Destructive actions are explicit.** Clearing site data is opt-in and says plainly what it removes.
5. **Nothing runs or leaves the browser unless it has to.** No network requests of its own, no data collection, and the narrowest code path.

## Accessibility & Inclusion

Both OS colour schemes are required. Tones must not rely on colour alone, because tags already carry their text values. Keep that true.

## Distribution

The extension will be published to the public Chrome Web Store as an open-source (MIT) extension. Until then it's built from source and loaded unpacked. The store listing assets and copy don't exist yet.
