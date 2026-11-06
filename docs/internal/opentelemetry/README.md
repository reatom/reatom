# OpenTelemetry engineering archive

This directory preserves design investigations, specifications, historical
measurements and test-harness instructions. It is outside the Astro content
collection and is not published to the documentation site or npm package.
Historical documents can describe earlier APIs and measurements.

User documentation lives in `docs/src/content/docs/guides/opentelemetry.md` and
`docs/src/content/docs/guides/opentelemetry/`.

The public package has one entry point. `src/index.ts` re-exports independently
implemented factories and extensions; the build preserves internal modules for
consumer tree-shaking. `tools/measure-example.mjs` measures the README's exact
extension chain from the built package, with core external, and checks its
rounded size comments. Run it after `pnpm build`; `--write` refreshes the source
example comments. The README code must remain identical to that source example.
