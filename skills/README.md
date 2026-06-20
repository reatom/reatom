# Reatom agent skills

Agent skills for [Reatom v1001](https://v1001.reatom.dev). Install with the [skills CLI](https://skills.sh/):

```bash
# All skills
npx skills add reatom/reatom

# Individual skills
npx skills add reatom/reatom --skill reatom
npx skills add reatom/reatom --skill reatom-async
npx skills add reatom/reatom --skill reatom-jsx
npx skills add reatom/reatom --skill reatom-review
```

| Skill           | Bundled reference                                                  |
| --------------- | ------------------------------------------------------------------ |
| `reatom`        | `REFERENCE.md` — compact v1001 API reference                       |
| `reatom-async`  | `REFERENCE.md` — async flows, cancellation, sampling, and Suspense |
| `reatom-jsx`    | `REFERENCE.md` — `@reatom/jsx` package docs                        |
| `reatom-review` | review checklist (loads `reatom` skill for API reference)          |

Full docs: [v1001.reatom.dev](https://v1001.reatom.dev)
