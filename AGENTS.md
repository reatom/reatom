# Agent instructions

## Skills and symlinks

Agent skills live in [`skills/`](skills/). **Edit only that directory.**

`.cursor/skills/` and `.agents/skills/` are directory symlinks to `skills/`. They are not separate copies.

Several external readmes are file symlinks to skill references:

| Symlink                            | Canonical source                 |
| ---------------------------------- | -------------------------------- |
| `summary.md`                       | `skills/reatom/REFERENCE.md`     |
| `docs/src/content/docs/summary.md` | `skills/reatom/REFERENCE.md`     |
| `packages/core/README.md`          | `skills/reatom/REFERENCE.md`     |
| `packages/jsx/README.md`           | `skills/reatom-jsx/REFERENCE.md` |

**Do not diff, merge, or sync these paths.** Identical content at multiple paths is expected — they are the same file via symlinks.

See [`skills/README.md`](skills/README.md) for the full layout diagram and skill list.

Contributors: see [Agent skills](CONTRIBUTING.md#agent-skills) in `CONTRIBUTING.md`.
