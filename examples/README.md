# Examples

Each folder is a **standalone** pnpm project (not part of the root monorepo workspace). Reatom packages are pinned to **`1001.*.*`** from npm.

```bash
cd examples/<name>
pnpm install
pnpm dev
```

Each example has its own `pnpm-workspace.yaml` so installs do not use the repository root workspace.

`examples/opentelemetry/` contains reference snippets only (no `package.json`).
