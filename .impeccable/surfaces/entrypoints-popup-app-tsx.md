---
version: 1
slug: "entrypoints-popup-app-tsx"
primary_target: "entrypoints/popup/App.tsx"
related_targets: ["entrypoints/options/App.tsx","components/popup/Popup.tsx"]
---

# Headering popup and options page

Scope: the whole extension UI, meaning the toolbar popup (`entrypoints/popup`, `components/popup`), the options page (`entrypoints/options`), the shared theme (`assets/tailwind.css`) and the shadcn primitives (`components/ui`). Visitor mode: **Operate**.

Audience and job: developers, QA and support switch header profiles and read the current page's headers within seconds. Engineers also edit, validate and share the JSON config on the options page.

Constraints: follow the push-based design guide (palette, Geist and Geist Mono, Solar icons, radius and spacing scales). Light and dark both follow the OS. Keep the popup at 360px wide and under Chrome's 600px height cap. Headering has its own identity (no push-based logo). Keep every feature, behaviour and e2e-tested label. The user rejected a left-edge rail or wire (2026-10-12), so don't bring one back.

## Direction contract

THESIS: Response first, outgoing below. The popup opens on what the page got back, then lists what Headering sends. It refuses both the stack of identical toggle cards and diagram chrome.

OWN-WORLD: The guide's slate neutrals (n-50 ground light, n-950 ground dark), with the response band on the card colour. Purple-600 (purple-400 on dark) is reserved for what's being sent right now: header lines and the active preset. Tones (success, warning, error) are only for response values and the worst-tone dot. Geist for names, Geist Mono for header names and values in one tabular column. Solar outline icons at 16px, radius 6–8px. Groups are one bordered block; there are no per-profile cards.

STORY: You open the popup, see whether the page came back healthy, flip a profile, and its header line turns purple. You know exactly which headers leave the browser.

FIRST VIEWPORT: A 48px header with the Headering mark, name and Solar actions (eraser for clear, incognito for reload as a new visitor, pause, settings). Then the response band: worst-tone dot, status chip, host and path, and the inspected rows with tone tags. Then the profile rows directly, with no section heading or count (the user removed them), and switches on the right edge. Groups are a bordered block labelled "One at a time", and presets are a select on the header line.

FORM: Response-first control panel (the alternate from the direction round, without its postmark decoration), chosen by the user after rejecting the request wire. Seed 6a07d170. Options page: the editor gets the stage, and the preview renders the same popup.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
