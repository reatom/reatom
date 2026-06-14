# Reatom TanStack Start SSR

SSR example for TanStack Start without React Server Components.

It mirrors the cache hydration flow from `packages/core/src/extensions/withCache.test.ts`:

1. Start creates a fresh Reatom frame for each request.
2. The server sets `urlAtom` from the request URL.
3. A Reatom async computed reads `?q=` and stores its result through `withCache`.
4. The server serializes the Reatom persist snapshot into the HTML.
5. The client restores that snapshot before `StartClient` hydrates.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000/?q=tanstack`.
