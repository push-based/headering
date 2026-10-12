---
name: Headering
description: A Chrome extension that changes and inspects HTTP headers, reading what the page got back first and what it sends below.
colors:
  sending-purple: "#7839EE"
  sending-purple-dark: "#A48AFB"
  purple-wash: "#F5F3FF"
  purple-ink: "#5720B7"
  purple-selection: "#DDD6FE"
  purple-selection-ink: "#2E125E"
  slate-ground: "#F8FAFC"
  paper-white: "#FFFFFF"
  slate-ink: "#121926"
  slate-quiet: "#697586"
  slate-hairline: "#E3E8EF"
  slate-input: "#CDD5DF"
  slate-held: "#9AA4B2"
  slate-wash: "#EEF2F6"
  night-ground: "#0D121C"
  night-surface: "#121926"
  night-hairline: "#202939"
  night-held: "#4B5565"
  night-ink: "#F8FAFC"
  success: "#16A34A"
  success-tag: "#DCFCE7"
  success-tag-ink: "#166534"
  warning: "#F59E0B"
  warning-tag: "#FEF3C7"
  warning-tag-ink: "#92400E"
  error: "#DC2626"
  error-tag: "#FEE2E2"
  error-tag-ink: "#991B1B"
  success-dark: "#4ADE80"
  warning-dark: "#FBBF24"
  error-dark: "#F87171"
typography:
  page-title:
    fontFamily: "Geist Variable, Geist, system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "28px"
  title:
    fontFamily: "Geist Variable, Geist, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  section-title:
    fontFamily: "Geist Mono Variable, Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  body:
    fontFamily: "Geist Variable, Geist, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  body-quiet:
    fontFamily: "Geist Variable, Geist, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Geist Variable, Geist, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "20px"
  header-line:
    fontFamily: "Geist Mono Variable, Geist Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "20px"
    fontFeature: "\"tnum\", \"zero\""
  status-code:
    fontFamily: "Geist Mono Variable, Geist Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "20px"
    fontFeature: "\"tnum\", \"zero\""
rounded:
  sm: "2px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.sending-purple}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    typography: "{typography.body}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.slate-ground}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline-hover:
    backgroundColor: "{colors.slate-wash}"
  button-ghost-icon:
    textColor: "{colors.slate-quiet}"
    rounded: "{rounded.lg}"
    size: "32px"
  button-ghost-icon-hover:
    backgroundColor: "{colors.slate-wash}"
    textColor: "{colors.slate-ink}"
  button-ghost-icon-pressed:
    backgroundColor: "{colors.slate-wash}"
    textColor: "{colors.slate-ink}"
  paused-tag:
    backgroundColor: "{colors.slate-wash}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    height: "20px"
    padding: "0 6px"
  switch-on:
    backgroundColor: "{colors.sending-purple}"
    rounded: "{rounded.full}"
    width: "32px"
    height: "18.4px"
  switch-off:
    backgroundColor: "{colors.slate-input}"
    rounded: "{rounded.full}"
    width: "32px"
    height: "18.4px"
  switch-held:
    backgroundColor: "{colors.slate-held}"
    rounded: "{rounded.full}"
  response-band:
    backgroundColor: "{colors.paper-white}"
    padding: "0 0 8px"
  tone-dot:
    rounded: "{rounded.full}"
    size: "8px"
  profile-row:
    padding: "8px 16px"
  profile-row-grouped:
    padding: "8px 7px"
  group-block:
    rounded: "{rounded.lg}"
  group-block-header:
    typography: "{typography.label}"
    padding: "6px 7px"
  header-line-sending:
    textColor: "{colors.sending-purple}"
    typography: "{typography.header-line}"
  header-line-off:
    textColor: "{colors.slate-quiet}"
    typography: "{typography.header-line}"
  tag-success:
    backgroundColor: "{colors.success-tag}"
    textColor: "{colors.success-tag-ink}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    height: "20px"
    padding: "0 6px"
  tag-warning:
    backgroundColor: "{colors.warning-tag}"
    textColor: "{colors.warning-tag-ink}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    height: "20px"
    padding: "0 6px"
  tag-error:
    backgroundColor: "{colors.error-tag}"
    textColor: "{colors.error-tag-ink}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    height: "20px"
    padding: "0 6px"
  status-chip:
    backgroundColor: "{colors.slate-ground}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.md}"
    typography: "{typography.status-code}"
    height: "20px"
    padding: "0 6px"
  inspected-row:
    rounded: "{rounded.md}"
    typography: "{typography.header-line}"
    height: "32px"
  json-editor:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.lg}"
    typography: "{typography.header-line}"
---

# Design System: Headering

## Overview

**Creative North Star: "The Readout First"**

Headering opens on the answer. The first thing under the popup's header is a readout of the page's last document request: a tone dot, the status code, the host, and the headers worth watching, each with its value. Directly below it, with no heading between them, come the profiles that shape the next request. The popup reads top to bottom as "this is what came back; this is what you're sending."

The system follows the push-based design guide's tokens: slate neutrals, a single purple, success / warning / error scales, Geist and Geist Mono, a fixed radius scale, and Solar icons. Tailwind's default palette is cleared, so only those scales exist. Headering wears its own identity in the guide's purple (the banded request/response mark in `assets/icon.svg`), not a push-based logo. It is an Operate surface: dense, quiet, scannable in seconds, with every switch on the right edge. Light and dark follow the OS and are both first-class.

Colour carries meaning, never decoration. Purple means sending; tones mean what the response said; slate is everything else. Sending colours don't fade between states, they step: colour switches in two frames over 90ms, like a signal changing.

**Key Characteristics:**
- The response readout leads the popup in a Paper White band; the profiles follow directly on the cooler slate ground.
- Purple on header lines and the preset border means "Headering is sending this right now".
- Paused leaves no sending purple and adds no tone: the neutral Paused tag appears in the header, checked switches go Slate Held, and header lines go Slate Quiet.
- Tones (success, warning, error) only for inspected response values, the worst-tone dot and status.
- Geist for names and UI text; Geist Mono with tabular, slashed-zero numerals for every header name, value and JSON.
- Flat, hairline-divided rows instead of cards; 90ms `steps(2)` on every sending colour change in a profile row.

## Colors

One purple on slate, with three tones that belong to the response.

### Primary
- **Sending Purple** (sending-purple; dark mode uses Sending Purple Dark): sending header lines, the active preset's value and its trigger border (at 50%), and checked switches. It is also the interactive accent: primary buttons, the caret and focus rings. On dark grounds the 600 shade burns, so dark mode swaps to the 400 shade throughout (`--primary`, `--sending`, `--ring`).
- **Purple Wash / Purple Ink** (purple-wash, purple-ink): the hover/selected accent surface and its text in menus and command items. Dark mode uses a 14% wash of the 400 shade with primary-200 text.
- **Purple Selection** (purple-selection, purple-selection-ink): text selection everywhere.

### Tertiary (response tones)
- **Success / Warning / Error** (success, warning, error and their -dark variants): the response band's tone dot (worst tone wins) and solid indicators such as the "copied" icon and the success check in a site-data result.
- **Tone tags** (success-tag + success-tag-ink, and the warning and error pairs): the pill behind an inspected value that matched a tone, and the options page's "Valid" / "n errors" tag. Dark mode uses a 16–18% wash of the 500 shade with 300-shade text.

### Neutral
- **Slate Ground** (slate-ground): the page ground and the profile list in light mode, a step cooler than Paper White so the response band reads as a band; night-ground in dark.
- **Paper White** (paper-white): card-level bands: the response band, the options header and footer, the editor, popovers. night-surface in dark.
- **Slate Ink** (slate-ink): body text; night-ink in dark.
- **Slate Quiet** (slate-quiet): secondary text, switched-off and held header lines, icon buttons at rest, shared header-name prefixes, a group's "One at a time" note.
- **Slate Hairline** (slate-hairline): every border and divider, including the group block's border and the rules between its rows; night-hairline in dark.
- **Slate Input** (slate-input): input borders and the unchecked switch track.
- **Slate Held** (slate-held; night-held in dark): the checked switch track while paused, so it shows what returns on resume.
- **Slate Wash** (slate-wash): the Paused tag and the pressed pause button (with Slate Ink), row hovers (at 40%, 60% on inspected rows), the group header (at 40%), ghost and outline button hovers.

The toolbar badge, which Chrome paints outside the page, uses the same scales as literal values: primary-600 normally, neutral-500 with "off" while paused, and success-700, warning-400 (with warning-950 text) or error-600 for a tone.

### Named Rules
**The Sending Rule.** Purple on a header means exactly one thing: Headering is sending it right now. A header line, a preset name, value or border, or a checked switch is purple only if its header leaves the browser on the next request. Off is slate; held is slate. Primary buttons, the caret and focus rings are the only other purple, as interactive accents.

**The Response-Owns-Tone Rule.** Green, amber and red are reserved for what came back (inspected values, the worst-tone dot) and for status: whether the config is valid and whether clearing site data worked. Paused is not a tone; it is neutral. Never for decoration, never for a profile, never for a button.

**The Text-Carries-Tone Rule.** Every tone tag carries its value as text and a 6px current-colour dot; the response band's tone dot sits beside the status code and has a screen-reader label. Colour is never the only signal.

## Typography

**Display Font:** none; the extension has no display tier.
**Body Font:** Geist Variable (with Geist, system-ui, -apple-system, sans-serif)
**Label/Mono Font:** Geist Mono Variable (with Geist Mono, ui-monospace, monospace)

**Character:** Geist speaks for people (profile names, hosts, labels, messages); Geist Mono speaks for the request (header names, values, status codes, paths, JSON). Mono runs with tabular, slashed-zero numerals so values line up in a column.

### Hierarchy
- **Page title** (600, 18px / 28px): "Headering" on the options page.
- **Title** (600, 14px / 20px): the popup's name in its 48px header and empty-state headings.
- **Section title** (Geist Mono 600, 14px / 20px): options page section headings ("Configuration", "Preview").
- **Body** (500, 14px / 20px): profile names and the request host.
- **Body quiet** (400, 14px / 20px): descriptions and status lines, in Slate Quiet.
- **Label** (500, 12px / 20px): group names, tone tags, the Paused tag, domain lists.
- **Header line** (Geist Mono 400, 12px / 20px): `+ name: value` and `− name` lines, inspected names and values, the request path, the JSON editor and its gutter.
- **Status code** (Geist Mono 600, 12px): the response's status chip.

### Named Rules
**The Mono-Is-Data Rule.** Anything a server would read (header names, values, status codes, paths, JSON, cookie names) is set in Geist Mono with tabular numerals. Anything a person named (profiles, groups, presets, hosts) is set in Geist.

**The Quiet Prefix Rule.** When every inspected header shares a dash-terminated prefix, the prefix is Slate Quiet and the distinguishing tail is full ink.

## Layout

The popup is a fixed 360px column capped at 600px tall (Chrome's popup limit), stacked top to bottom: a 48px header with a hairline under it; an optional site-data result alert (12px inset); the response band; the profile list; or, with no profiles, the empty state. Only the profile list scrolls; everything above it holds its height.

The response band runs full width on Paper White with a hairline below. Its first line (16px sides, 12px top) is the tone dot, the status chip, then the host with the path trailing in mono, and "Sample response" in the options preview. Inspected rows sit 8px in from the edges, 32px tall, with names in a 124px mono column so values align.

The profile list follows the response band directly, with no section heading, and scrolls with 8px of padding at its top and bottom. Profile rows are full width with 16px sides and 8px top and bottom; the switch sits on the right, top-aligned with the name, and header lines follow 4px apart. A mutually exclusive group is one bordered block inset 8px from both edges with 4px above and below: a header line ("<name> · One at a time") on a 40% wash, then its rows, each separated by a hairline rule. Inside the block the header and rows pad 7px, so with the 8px inset and the 1px border, grouped text stays on the same 16px column and grouped switches on the same right edge as ungrouped rows. The empty state is plain text at 16px sides: a title, one line of quiet copy and a primary button.

The options page is a max-1280px (7xl) grid with 16–24px side padding and a 32px gap: the editor takes the flexible column and the preview a fixed 362px column at large widths, sized to the popup frame, stacking below. Header and a sticky footer are Paper White bands with hairlines; the footer holds Discard and Apply at the right.

Spacing steps by 4px: 4, 8, 12, 16, 24, 32.

## Elevation & Depth

Flat. Depth is conveyed by surface tone and hairlines: Slate Ground for the page and the profile list, Paper White for the response band, options chrome and editor, 1px Slate Hairline dividers between them. Floating layers (popovers, tooltips) keep the primitive library's medium shadow and a 10% ink ring. The only bespoke shadow frames the options page's popup preview so it reads as the popup lifted onto the page (`0 4px 16px -4px rgb(13 18 28 / 0.12)`); it is a framing device for that preview, not a general elevation token.

### Named Rules
**The Band-Not-Card Rule.** Group content into full-width bands and rows divided by hairlines. Profiles never sit in individual bordered cards; the only bordered block in the list is a mutually exclusive group, and its rows share it.

## Shapes

Small, consistent corners from the guide's scale: 6px (md) for tags, the status chip and inspected-row hover fills; 8px (lg) for buttons, the group block, the editor and popovers; 12px (xl) for the preview frame. Circles (full) only for switches and tone dots: the response band's 8px dot and the 6px dot inside a tone tag. Hairlines do the rest: under the header, under the response band, around a group and between its rows.

## Components

### Buttons
Shadcn buttons on the guide's tokens: firm, compact, unadorned.
- **Shape:** 8px corners; 32px default and icon size, 28px small.
- **Primary:** Sending Purple fill, white text; hover drops to 80%. Used for Apply, Import configuration and Reload Headering only.
- **Outline:** ground fill with a hairline border, hover to Slate Wash. Options page actions and the preset trigger.
- **Ghost icon:** Slate Quiet icon, hover to Slate Wash. The popup header's actions; the pause button's pressed state is neutral, Slate Wash with Slate Ink.
- **Focus:** purple ring at 50% (3px) with a ring-coloured border. Active presses translate 1px down.

### Chips (tags)
- **Style:** 20px tall with 6px side padding in the popup (24px tall, 8px padding on the options page), 6px corners, 12px medium text, tone-tag fill with tone-tag ink. Inspected values carry a 6px current-colour dot; the options page's validity tags carry a Solar icon instead.
- **Paused tag:** the same 20px shape in Slate Wash with Slate Ink and a 12px Solar pause icon; neutral, because pausing is a state of the extension, not a response.
- **Status chip:** the response code in Geist Mono semibold on the ground colour with a hairline border; neutral, because the tone dot beside it carries the tone.

### Switches
- **Shape:** 32 × 18.4px pill, 16px white thumb (neutral-400 thumb when unchecked in dark).
- **State:** checked is Sending Purple; unchecked is Slate Input; checked while paused is Slate Held, so it shows what returns on resume. Switches stay operable while paused.

### Inputs / Fields
- **JSON editor:** Paper White, hairline border, 8px corners, Geist Mono 12/20 with a 48px line-number gutter on a muted 40% wash. Focus turns the border to the ring colour with a 3px ring at 30%; the invalid line is marked in the gutter.
- **Preset picker:** the header name in mono, then an outline button 28px tall showing the label in Geist and the value in Geist Mono; while sending, the name and value are purple and the border is purple at 50%. It opens a searchable command list where labels and values align in a subgrid and the selected item shows a purple check.

### Navigation
The popup header is the only navigation: 20px mark, "Headering" title, an optional Paused tag, then ghost icon buttons (clear site data with an eraser, reload as a new visitor with an incognito icon, pause/resume, settings), each with a tooltip.

### Response Band
The page's last document request, leading the popup.
- **Status line:** an 8px tone dot in the worst tone among inspected values (absent when none matched), the neutral status chip, the host in Geist 14 medium, and the path and query in Geist Mono 12 Slate Quiet, truncating.
- **Inspected rows:** 32px mono rows with an optional Solar direction arrow (only when both request and response headers are inspected), a 124px name column, the value as plain text, a tone tag, or an italic "not set", a hover wash at 60%, and a copy button revealed on hover or focus.
- **Loading / none:** a skeleton of the same shape so the popup doesn't jump; without a captured request, one quiet line.

### Profile Rows
- **Row:** the profile name (Body) with its domains below (12px, Slate Quiet), the switch on the right, then one header line per header: `+ name: value` to set, `− name` to remove, in Geist Mono, Sending Purple when sending and Slate Quiet when off or held. Hover washes the row at 40%.
- **Group block:** a mutually exclusive group's rows inside one 8px-cornered hairline block; its header line shows the group name (Label) and "One at a time" (Slate Quiet) on a 40% wash, and rows are divided by hairline rules.
- **Motion:** every sending colour change in a row (header lines, the preset's header name, value and trigger border) uses `transition-colors 90ms steps(2)`.

## Do's and Don'ts

### Do:
- **Do** keep the response band first, directly under the header, and the profile list straight below it with no heading.
- **Do** add popup content as full-width rows: 16px sides, 8px top and bottom; inside a group block, 7px sides with a hairline rule above each row, so text and switches keep the ungrouped column and edge.
- **Do** colour anything that leaves the browser Sending Purple while it is sending, and slate the moment it isn't.
- **Do** use Solar linear icons only (`~icons/solar/*-linear`), at 12px inline and in 20px tags, 16px in buttons and 24px tags, 20px for the header mark.
- **Do** set header names, values, status codes and JSON in Geist Mono with tabular, slashed-zero numerals.
- **Do** use Geist Mono 14/20 semibold for section titles on the options page.
- **Do** step sending colour changes in profile rows over 90ms with `steps(2)`.
- **Do** swap to the 400 shades of purple and tones on dark grounds, with 14–18% washes for tag fills.
- **Do** pair every tone with its text value.

### Don't:
- **Don't** wrap profiles in individual cards or stack identical toggle cards; only a mutually exclusive group gets a bordered block.
- **Don't** use purple for anything that isn't being sent right now, beyond primary buttons, focus and the caret.
- **Don't** leave any sending purple while paused; the Paused tag shows it, checked switches go Slate Held and header lines go Slate Quiet.
- **Don't** use success, warning or error colours outside response values and status; paused is neutral, never amber.
- **Don't** mix icon sets or add Lucide icons.
- **Don't** add colours outside the guide's scales; Tailwind's default palette is intentionally cleared.
- **Don't** put a push-based logo in the UI; Headering uses its own mark.
- **Don't** ease or fade state colours over long durations; a header line switches, it doesn't glow.
