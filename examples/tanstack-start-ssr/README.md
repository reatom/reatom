# Reatom TanStack Start SSR

SSR example for TanStack Start without React Server Components.

It mirrors the cache hydration flow from `packages/core/src/extensions/withCache.test.ts`:

1. The root route loader creates a fresh Reatom frame.
2. The loader sets `urlAtom` from the request URL.
3. A Reatom async computed reads `?q=` and stores its result through `withCache`.
4. The loader serializes the Reatom persist snapshot into the HTML.
5. The root route restores that snapshot before rendering the page.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000/?q=tanstack`.
