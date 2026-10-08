# Contributing to Headering

Thanks for helping out. Bug reports, ideas and pull requests are all welcome.

## Reporting bugs and suggesting features

Open an [issue](https://github.com/push-based/headering/issues). For a bug, include:

- your Chrome version and operating system
- the config you used, or the smallest part of it that shows the problem (remove anything private)
- what you expected and what happened instead
- any errors from the extension's service worker console (`chrome://extensions` → Headering → **Inspect views: service worker**)

For a feature, explain the problem you want to solve before the solution you have in mind. That makes it easier to find something that fits the config format.

## Setting up

You need Node.js 22.18 or newer and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/push-based/headering.git
cd headering
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

`pnpm dev` opens Chrome with the extension loaded and reloads it as you edit. The [README](README.md#development) lists the other scripts and explains the project layout.

## Making a change

1. Fork the repo and create a branch from `main`.
2. Make your change. Keep each pull request to one idea.
3. Add or update tests:
   - Unit tests sit next to the code in `lib/` as `*.test.ts` and run with Vitest and WXT's fake browser.
   - End-to-end tests are in `e2e/` as `*.e2e.ts`. They load the built extension in Chromium with Playwright and check the headers a local server receives. Add one when a change affects which headers are sent or what the popup shows.
4. Check that everything passes:

   ```bash
   pnpm compile
   pnpm test
   pnpm e2e
   ```

5. Open a pull request that describes what changed and why. Add a screenshot if you changed the popup or options page.

### Changing the config format

The config format is a public interface, because people share config files. If you change it:

- update the Zod schema in `lib/config.ts`, which is the source of truth
- keep `serializeConfig` in sync so an exported config imports back unchanged
- run `pnpm schema` and commit the regenerated `config.schema.json`
- update the configuration tables in the README and, if it helps, the files in `examples/`

Don't break existing configs. If an incompatible change can't be avoided, raise it in an issue first.

### Code style

- Match the code around your change. The project uses TypeScript in strict mode, React function components, Tailwind and shadcn/ui.
- Keep logic that doesn't need the browser, such as `lib/rules.ts`, as pure functions so it's easy to test.
- Write comments that explain why, not what.

### Commit messages

Write the subject line as a short imperative sentence that describes the change from the user's point of view, such as `Add pause all to the popup` or `Keep option labels on one line in the picker`. Don't use type prefixes like `feat:`. Use the body for anything that needs more explanation.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
