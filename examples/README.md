# Examples

Each folder is a pnpm project that can run both inside this monorepo and as a standalone copy.

Inside the monorepo, examples are part of the root workspace. pnpm links local Reatom packages when their versions satisfy the normal semver ranges in an example's `package.json`.

When an example folder is copied or cloned separately, the same `package.json` installs published Reatom packages from npm. Do not use `workspace:` or `catalog:` ranges in example manifests.

```bash
cd examples/<name>
pnpm install
pnpm dev
```

Examples use the root `pnpm-lock.yaml` in the monorepo. Per-example `pnpm-lock.yaml` files should not be committed.

`examples/opentelemetry/` contains reference snippets only (no `package.json`).
