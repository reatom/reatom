# Lit Documentation Audit — Deduplication & Content Validation

## TL;DR

> **Quick Summary**: Fix 4 incorrect code examples, deduplicate 6 content clusters, and resolve 2 minor inconsistencies across 26 TS source files in `packages/lit/docs/`. Then regenerate markdown.
> 
> **Deliverables**:
> - All critical code bugs fixed (4 files)
> - Duplicated content consolidated with cross-references (10+ files affected)
> - Import consistency enforced (5 files)
> - Regenerated markdown output
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Wave 1 (bugs) → Wave 2 (dedup) → Wave 3 (minor) → Wave 4 (regenerate)

---

## Context

### Original Request
Analyze `packages/lit/docs` for deduplication and content validation. Ensure documentation isn't telling nonsense or duplicating content.

### Research Findings
- **All API exports verified against source**: ReatomLitElement, withReatomElement, watch, html, svg (from @reatom/lit); atom, action, computed, wrap, context, peek, reatomForm, withAsyncData (from @reatom/core)
- **`watch()` returns `DirectiveResult`** (via `noChange` sentinel from Lit), NOT the atom value. It only works inside Lit template expression positions. Storing in a variable produces an opaque object.
- **`ReatomLitElement.render()` runs inside `reatomAbstractRender`**, meaning atoms called via `atom()` ARE tracked for dependency — components WILL re-render when those atoms change (just less efficiently than `watch()`)
- **`context.start()` is a valid API** — confirmed at `packages/core/src/core/atom.ts` line 1042
- **Generated markdown accurately mirrors source TS** — doc generation pipeline works correctly

### Metis-Style Gap Analysis Applied
- Verified each "bug" claim against actual source implementations before reporting
- Cross-referenced all duplication claims with file-level line counts
- Checked whether "inconsistencies" are actual bugs vs valid alternative patterns

---

## Work Objectives

### Core Objective
Ensure all documentation code examples are correct and content is not unnecessarily duplicated.

### Concrete Deliverables
- 4 critical code fixes in source TS files
- 6 deduplication actions (remove, merge, or cross-reference)
- 2 minor fixes (imports, annotations)
- Successful markdown regeneration

### Definition of Done
- [ ] Zero incorrect `watch()` usages in variable position
- [ ] Zero misleading comments about reactivity behavior
- [ ] No content repeated identically across files
- [ ] All files import `html` consistently
- [ ] `pnpm run docs:gen` succeeds after all changes

### Must Have
- All code examples must be correct TypeScript that would actually work at runtime
- Cross-references between related topics
- Consistent import patterns across files

### Must NOT Have (Guardrails)
- Do NOT change the overall documentation structure or config.ts page organization
- Do NOT add new documentation files — only edit existing ones
- Do NOT modify the doc generation system itself
- Do NOT change @reatom/lit or @reatom/core source code
- Do NOT modify generated markdown files directly (they'll be regenerated)
- Do NOT change pedagogical intent — keep the same teaching goals per file
- Do NOT remove content that serves a unique pedagogical purpose even if structurally similar

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES — `pnpm run docs:gen` generates markdown
- **User wants tests**: NO — this is a documentation-only task
- **Framework**: N/A
- **QA approach**: Automated verification via TypeScript compilation and doc regeneration

### Automated Verification

**For each code change:**
```bash
# Verify TypeScript correctness of changed files
npx tsc --noEmit packages/lit/docs/**/*.ts 2>&1 || true
# Note: Files may not compile standalone due to missing module context
# Primary check: no NEW errors introduced
```

**After all changes:**
```bash
# Regenerate documentation
pnpm run docs:gen

# Verify output was created
ls -la docs/src/content/docs/handbook/lit/**/*.md
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Critical Bug Fixes):
├── Task 1: Fix component-composition.ts watch() misuse
├── Task 2: Fix memory.ts watch() cast to array
├── Task 3: Fix debugging.ts misleading "Won't update" comment
└── Task 4: Fix debugging.ts "bad conditional watch" section

Wave 2 (After Wave 1 - Deduplication):
├── Task 5: Remove duplicate "atoms in render" from performance.ts
├── Task 6: Deduplicate atomization pattern in performance.ts
├── Task 7: Merge or cross-reference auto-reactivity.ts
├── Task 8: Consolidate "when to use" guidance
└── Task 9: Cross-reference async pattern in debugging.ts

Wave 3 (After Wave 2 - Minor Fixes):
├── Task 10: Fix html import inconsistency in 5 files
└── Task 11: Add @doc-expand to organization.ts

Wave 4 (After Wave 3 - Regenerate):
└── Task 12: Regenerate markdown documentation
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 12 | 2, 3, 4 |
| 2 | None | 12 | 1, 3, 4 |
| 3 | None | 12 | 1, 2, 4 |
| 4 | None | 12 | 1, 2, 3 |
| 5 | Wave 1 | 12 | 6, 7, 8, 9 |
| 6 | Wave 1 | 12 | 5, 7, 8, 9 |
| 7 | Wave 1 | 12 | 5, 6, 8, 9 |
| 8 | Wave 1 | 12 | 5, 6, 7, 9 |
| 9 | Wave 1 | 12 | 5, 6, 7, 8 |
| 10 | Wave 2 | 12 | 11 |
| 11 | Wave 2 | 12 | 10 |
| 12 | 10, 11 | None | None (final) |

---

## TODOs

### 🔴 Wave 1: Critical Bug Fixes

- [ ] 1. Fix `watch()` misuse in component-composition.ts

  **What to do**:
  - In `examples/component-composition.ts`, fix TWO locations where `watch()` result is stored in a variable and used for string interpolation
  - **Line 24 (Header component)**: Change `const currentTheme = watch(theme)` pattern. The `watch()` directive returns `DirectiveResult`, not a string. When used in `class="header theme-${currentTheme}"`, it produces `theme-[object Object]`
  - **Line 82 (App component)**: Same issue with `const currentTheme = watch(theme)` used in `class="app theme-${currentTheme}"`
  - Fix approach: Use `theme()` to get the actual string value for variable usage, keep `watch()` only in direct template expression positions where Lit can process it as a directive. Since this file imports `html` from `'lit'` (not `'@reatom/lit'`), and uses `watch()` explicitly, the correct pattern is:
    ```ts
    // Header.render():
    override render() {
      return html`
        <header class="header theme-${theme()}">
          <h1>My App</h1>
          <button @click=${this.handleToggleTheme}>
            Toggle Theme (${watch(theme)})
          </button>
        </header>
      `
    }
    ```
  - Apply same fix to App.render() at line 82

  **Must NOT do**:
  - Do NOT change the component structure or behavior
  - Do NOT change what the component renders — only fix HOW it accesses atom values

  **References**:
  - `packages/lit/src/watch.ts:57` — `watch()` returns `watchDirective(target, top())` which is a `DirectiveResult`
  - `packages/lit/src/watch.ts:51` — The directive's `render()` returns `noChange` (Lit sentinel)
  - `packages/lit/docs/examples/component-composition.ts:24,82` — The two broken lines

  **Acceptance Criteria**:
  - [ ] No `watch()` calls stored in `const` variables for later use in class attribute interpolation
  - [ ] `theme()` used where string value is needed (class names)
  - [ ] `watch(theme)` used where Lit directive is appropriate (text content positions)
  - [ ] Component behavior unchanged — still toggles theme, still shares state

  **Commit**: YES (group with Task 2-4)
  - Message: `fix(docs/lit): correct watch() misuse in code examples`
  - Files: `packages/lit/docs/examples/component-composition.ts`

---

- [ ] 2. Fix `watch()` cast to array in memory.ts

  **What to do**:
  - In `best-practices/memory.ts` line 104, fix `const items = watch(itemsAtom) as Item[]`
  - `watch()` returns `DirectiveResult`, not an array. Casting with `as Item[]` masks the error but `repeat()` will fail at runtime because `DirectiveResult` isn't iterable
  - Fix: Use `itemsAtom()` to get the actual array value for `repeat()`:
    ```ts
    class LargeListComponent extends ReatomLitElement {
      render() {
        const items = itemsAtom()

        return html`
          <ul>
            ${repeat(
              items,
              (item) => item.id,
              (item) => html`<li>${item.name}</li>`
            )}
          </ul>
        `
      }
    }
    ```

  **Must NOT do**:
  - Do NOT change the list rendering pattern or the `repeat()` usage
  - Do NOT remove the example — it demonstrates a valid pattern (large list with keyed rendering)

  **References**:
  - `packages/lit/src/watch.ts:34,51` — `watch()` render returns `noChange`, not the atom value
  - `packages/lit/docs/best-practices/memory.ts:102-116` — The broken component

  **Acceptance Criteria**:
  - [ ] `watch(itemsAtom) as Item[]` replaced with `itemsAtom()`
  - [ ] `repeat()` receives an actual array, not a `DirectiveResult`
  - [ ] Template still uses `repeat()` for keyed list rendering

  **Commit**: YES (group with Task 1, 3, 4)
  - Files: `packages/lit/docs/best-practices/memory.ts`

---

- [ ] 3. Fix misleading "Won't update!" comment in debugging.ts

  **What to do**:
  - In `best-practices/debugging.ts` line 80, the comment says:
    ```ts
    return litHtml`<div>${countAtom()}</div>` // Won't update!
    ```
  - This is WRONG. `ReatomLitElement.render()` runs inside `reatomAbstractRender` (see `ReatomLitElement.ts:40-45`), so calling `countAtom()` DOES create a dependency. The component WILL re-render when the atom changes — it's just less efficient (full re-render vs targeted DOM update via `watch()`)
  - The `watch-directive.ts` file correctly calls this "Less efficient" (Approach 3, lines 80-101). The debugging file contradicts this.
  - Fix the comment and the `@doc-expand` explanation:
    ```ts
    // ❌ BAD: Less efficient - full component re-render on every atom change
    class LessEfficientComponent extends ReatomLitElement {
      override render() {
        return litHtml`<div>${countAtom()}</div>` // Works but causes full re-render
      }
    }
    ```
  - Also update the `@doc-expand` text at line 92 from "Using html from 'lit' instead of '@reatom/lit'. The component re-renders but DOM shows stale values." to accurately describe the actual behavior: less efficient but functional

  **Must NOT do**:
  - Do NOT remove the ❌/✅ pattern — it's helpful for scanning
  - Do NOT change the "good" example — `html` from `@reatom/lit` with auto-reactivity IS the recommended approach

  **References**:
  - `packages/lit/src/ReatomLitElement.ts:40-45` — `render()` wrapped in `reatomAbstractRender`, tracking all atom reads
  - `packages/lit/docs/basic/watch-directive.ts:80-101` — Correct description: "Approach 3: Standard Lit html (Less efficient)"
  - `packages/lit/docs/best-practices/debugging.ts:77-94` — The misleading section

  **Acceptance Criteria**:
  - [ ] Comment changed from "Won't update!" to accurately describe behavior (less efficient but functional)
  - [ ] `@doc-expand` text at line 92 no longer says "DOM shows stale values"
  - [ ] Consistent with watch-directive.ts description of Approach 3

  **Commit**: YES (group with Task 1, 2, 4)
  - Files: `packages/lit/docs/best-practices/debugging.ts`

---

- [ ] 4. Fix "bad conditional watch" section in debugging.ts

  **What to do**:
  - In `best-practices/debugging.ts` lines 104-126, the "good" example stores `watch()` in a variable:
    ```ts
    // ✅ GOOD: Watch outside conditional
    class GoodConditionalComponent extends ReatomLitElement {
      override render() {
        const count = watch(countAtom)  // ← DirectiveResult, NOT a number!
        const show = showCountAtom()
        return html`
          ${show ? html`<div>Count: ${count}</div>` : html`<div>Hidden</div>`}
        `
      }
    }
    ```
  - `const count = watch(countAtom)` stores a `DirectiveResult`, not the atom value. When used in `${count}` inside the template, Lit WILL process it as a directive — so this actually works in this specific case (template expression position). But it's confusing and error-prone to teach this pattern.
  - The "bad" example using `watch()` inside a conditional template IS actually a valid Lit pattern — directives inside conditional templates work fine.
  - Rewrite both examples to show the ACTUAL issue with conditionals: subscription lifecycle. When `watch(countAtom)` is in a branch that doesn't render, the subscription is cleaned up. When it renders again, it resubscribes. This is the real concern.
  - Recommended rewrite:
    ```ts
    // Using watch() in conditional branches
    // Both approaches work, but have different subscription behaviors:

    // Approach A: watch() in both branches — subscription always active
    class AlwaysSubscribedComponent extends ReatomLitElement {
      override render() {
        return html`
          <div>
            ${showCountAtom()
              ? html`<div>Count: ${watch(countAtom)}</div>`
              : html`<div>Hidden (count is still tracked: ${watch(countAtom)})</div>`
            }
          </div>
        `
      }
    }

    // Approach B: watch() in one branch — subscription only when visible
    class ConditionalSubscriptionComponent extends ReatomLitElement {
      override render() {
        return html`
          <div>
            ${showCountAtom()
              ? html`<div>Count: ${watch(countAtom)}</div>`
              : html`<div>Hidden</div>`
            }
          </div>
        `
      }
    }
    ```
  - Update the `@doc-expand` annotation to explain subscription lifecycle differences, not "good vs bad"

  **Must NOT do**:
  - Do NOT remove the section — conditional rendering with directives IS an important topic
  - Do NOT make it overly complex — keep it focused on the key insight

  **References**:
  - `packages/lit/src/watch.ts:7-52` — AtomDirective lifecycle (reconnected/disconnected/subscribe)
  - `packages/lit/docs/best-practices/debugging.ts:96-126` — Current section

  **Acceptance Criteria**:
  - [ ] No `watch()` result stored in `const` variables
  - [ ] Section explains subscription lifecycle in conditional branches
  - [ ] No misleading ❌ BAD / ✅ GOOD labels on valid patterns
  - [ ] Code examples are correct Lit patterns

  **Commit**: YES (group with Task 1, 2, 3)
  - Files: `packages/lit/docs/best-practices/debugging.ts`

---

### 🟠 Wave 2: Content Deduplication

- [ ] 5. Remove duplicate "atoms in render" tip from performance.ts

  **What to do**:
  - In `best-practices/performance.ts` lines 218-244, section "4. Avoid creating atoms in render methods" is nearly identical to `best-practices/memory.ts` lines 16-30
  - Both show the same BadComponent/GoodComponent pattern
  - Remove the duplicate section from `performance.ts` and replace with a cross-reference:
    ```ts
    /** @doc-expand
     * 4. Avoid creating atoms in render methods
     *
     * Creating atoms in render methods causes memory leaks and performance issues.
     * See [Memory Management](/handbook/lit/best-practices/memory) for detailed
     * examples and solutions.
     */
    ```
  - Keep the full version in `memory.ts` where it's the primary topic

  **Must NOT do**:
  - Do NOT remove from memory.ts — that's the canonical location
  - Do NOT change the numbering of other sections in performance.ts

  **References**:
  - `packages/lit/docs/best-practices/memory.ts:16-30` — Canonical version (keep)
  - `packages/lit/docs/best-practices/performance.ts:218-244` — Duplicate (replace with cross-ref)

  **Acceptance Criteria**:
  - [ ] performance.ts section 4 replaced with cross-reference to memory management page
  - [ ] memory.ts section unchanged
  - [ ] No actual bad/good component code duplicated between files

  **Commit**: YES (group with Task 6-9)
  - Message: `docs(lit): deduplicate content and add cross-references`
  - Files: `packages/lit/docs/best-practices/performance.ts`

---

- [ ] 6. Deduplicate atomization pattern in performance.ts

  **What to do**:
  - In `best-practices/performance.ts` lines 246-281, section "5. Use atomization for lists" defines a `Todo` type and `AtomizedListComponent` that duplicates `advanced/atomization.ts`
  - Replace the inline code example with a brief description and cross-reference:
    ```ts
    /** @doc-expand
     * 5. Use atomization for lists
     *
     * The atomization pattern provides O(1) updates instead of O(n) for list
     * modifications. Each item's mutable properties become individual atoms,
     * so updating one item doesn't trigger re-renders of other items.
     *
     * For detailed explanation, examples, and benefits, see the
     * [Atomization in Lit Components](/handbook/lit/advanced/atomization) section.
     */
    ```
  - Remove the `Todo` type definition and `AtomizedListComponent` code from performance.ts

  **Must NOT do**:
  - Do NOT change atomization.ts or todo-app.ts — they serve distinct purposes
  - Do NOT remove the mention of atomization from performance.ts — just remove the code duplication

  **References**:
  - `packages/lit/docs/advanced/atomization.ts` — Full atomization teaching (keep as-is)
  - `packages/lit/docs/examples/todo-app.ts` — Complete example (keep as-is)
  - `packages/lit/docs/best-practices/performance.ts:246-281` — Duplicate code (replace with cross-ref)

  **Acceptance Criteria**:
  - [ ] No `Todo` type definition in performance.ts
  - [ ] No `AtomizedListComponent` code in performance.ts
  - [ ] Cross-reference link to atomization page present
  - [ ] The `@doc-expand` key tips at end of file (lines 283-298) still mention atomization conceptually

  **Commit**: YES (group with Task 5, 7-9)
  - Files: `packages/lit/docs/best-practices/performance.ts`

---

- [ ] 7. Address auto-reactivity.ts near-zero value add

  **What to do**:
  - `basic/auto-reactivity.ts` is 22 lines showing that `html` from `@reatom/lit` auto-wraps atoms with `watch()`
  - `basic/watch-directive.ts` already covers this as "APPROACH 1: Auto-reactive html" (lines 19-34) with a full comparison across 3 approaches
  - The auto-reactivity file adds almost no new information
  - **Approach**: Enhance `auto-reactivity.ts` to differentiate it by adding an `svg` example (since the `@doc-expand` title mentions "html and svg" but no svg example exists anywhere):
    ```ts
    /** @doc-expand
     * Auto Reactivity
     *
     * Automatic Reactivity with html and svg
     *
     * Import html and svg from @reatom/lit for automatic atom wrapping.
     * These functions detect atoms in template expressions and apply the
     * watch directive automatically — no need for explicit watch() calls.
     */

    import { atom } from '@reatom/core'
    import { ReatomLitElement, html, svg } from '@reatom/lit'

    const label = atom('Hello', 'label')
    const radius = atom(40, 'radius')
    const color = atom('#4CAF50', 'color')

    class AutoReactiveComponent extends ReatomLitElement {
      render() {
        // Atoms are automatically wrapped with watch() — just use them directly
        return html`
          <div>
            <p>${label}</p>
            ${svg`
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="${radius}" fill="${color}" />
              </svg>
            `}
          </div>
        `
      }
    }
    ```
  - This differentiates it from watch-directive.ts by showing the svg function and demonstrating auto-reactivity in attribute positions

  **Must NOT do**:
  - Do NOT delete auto-reactivity.ts — it's referenced in config.ts and has a generated page
  - Do NOT duplicate watch-directive.ts content

  **References**:
  - `packages/lit/docs/basic/auto-reactivity.ts` — Current 22-line file
  - `packages/lit/docs/basic/watch-directive.ts:19-34` — Already covers auto-reactive html
  - `packages/lit/src/html.ts` — Shows both `html` and `svg` are exported with auto-watch

  **Acceptance Criteria**:
  - [ ] auto-reactivity.ts shows both `html` AND `svg` auto-reactive functions
  - [ ] Content is distinct from watch-directive.ts Approach 1
  - [ ] Demonstrates atoms in attribute positions (not just text content)

  **Commit**: YES (group with Task 5, 6, 8, 9)
  - Files: `packages/lit/docs/basic/auto-reactivity.ts`

---

- [ ] 8. Consolidate "when to use" guidance

  **What to do**:
  - Three files cover the same "when to use Reatom vs Lit properties" decision:
    - `advanced/when-to-use.ts` (dedicated file, 39 lines) — KEEP as canonical
    - `advanced/benefits.ts` (35 lines, JSDoc only, no code) — overlaps with when-to-use
    - `best-practices/organization.ts` (lines 92-189) — repeats the decision matrix
  - In `organization.ts`, replace the "When to Use Atoms in Components" / "When to Use Lit Properties" / "Choosing Between Approaches" sections (lines 92-189) with a brief mention and cross-reference to `when-to-use.ts`:
    ```ts
    /**
     * ### Choosing Between Atoms and Lit Properties
     *
     * For a complete guide on when to use Reatom atoms vs Lit properties,
     * see [When to Use Which](/handbook/lit/advanced/when-to-use).
     *
     * Quick rule: Domain data → atoms (separate files). UI-only state → atoms in component.
     * External interop → Lit properties.
     */
    ```
  - In `benefits.ts`, add a reference to when-to-use.ts since benefits already lives in the same "Mixed Reactivity" chapter. Keep the content but add:
    ```ts
    /** @doc-expand
     * For a detailed comparison table of when to use each approach,
     * see [When to Use Which](/handbook/lit/advanced/when-to-use).
     */
    ```

  **Must NOT do**:
  - Do NOT delete benefits.ts — it's in the config and has a generated page
  - Do NOT modify when-to-use.ts — it's the canonical reference
  - Do NOT remove the code examples in organization.ts (Examples 1-4) — only remove the redundant guidance text

  **References**:
  - `packages/lit/docs/advanced/when-to-use.ts` — Canonical decision guide (keep untouched)
  - `packages/lit/docs/advanced/benefits.ts` — Add cross-reference
  - `packages/lit/docs/best-practices/organization.ts:92-189` — Replace guidance with cross-reference

  **Acceptance Criteria**:
  - [ ] organization.ts no longer has a "When to Use Atoms" vs "When to Use Lit Properties" detailed comparison
  - [ ] organization.ts has cross-reference to when-to-use page
  - [ ] benefits.ts has cross-reference to when-to-use page
  - [ ] when-to-use.ts unchanged
  - [ ] Code examples in organization.ts (Modal, SharedButton) preserved

  **Commit**: YES (group with Task 5-7, 9)
  - Files: `packages/lit/docs/best-practices/organization.ts`, `packages/lit/docs/advanced/benefits.ts`

---

- [ ] 9. Cross-reference async pattern in debugging.ts

  **What to do**:
  - `best-practices/debugging.ts` lines 166-186 define `dataAtom`, `loadingAtom`, and `fetchData` action — nearly identical to `advanced/async-operations.ts` lines 14-31
  - The debugging version adds `console.log` statements, which IS the point (debugging), but the entire state setup is duplicated
  - Add a reference comment at the top of the debugging async section:
    ```ts
    /** @doc-expand
     * 7. Debugging async operations
     *
     * When debugging async actions (see [Async Operations](/handbook/lit/advanced/async-operations)
     * for the full pattern), add logging to verify correct execution:
     */
    ```
  - Keep the actual code example (it serves a distinct debugging purpose) but acknowledge the pattern origin

  **Must NOT do**:
  - Do NOT remove the debugging code — it demonstrates a valid debugging technique
  - Do NOT merge the files — they serve different purposes

  **References**:
  - `packages/lit/docs/advanced/async-operations.ts:14-63` — Canonical async pattern
  - `packages/lit/docs/best-practices/debugging.ts:160-192` — Debugging version

  **Acceptance Criteria**:
  - [ ] Cross-reference to async-operations page added in debugging.ts section 7
  - [ ] Debugging code example preserved with console.log statements

  **Commit**: YES (group with Task 5-8)
  - Files: `packages/lit/docs/best-practices/debugging.ts`

---

### 🟡 Wave 3: Minor Fixes

- [ ] 10. Fix html import inconsistency across 5 files

  **What to do**:
  - Five files import `html` from `'lit'` while using explicit `watch()`. This WORKS but contradicts the docs' own recommendation to use `html` from `'@reatom/lit'`:
    - `basic/reactive-component.ts` line 9
    - `basic/multiple-atoms.ts` line 10
    - `basic/passing-atoms.ts` line 10
    - `advanced/mixed-reactivity.ts` line 9
    - `advanced/async-operations.ts` line 12
  - Change each to import `html` from `'@reatom/lit'` and remove explicit `watch()` calls where auto-reactivity suffices:
    - **reactive-component.ts**: Change `import { html } from 'lit'` → `import { html } from '@reatom/lit'`, change `html\`Timer: ${watch(timer)}, ${++renderCount}\`` → `html\`Timer: ${timer}, ${++renderCount}\``  
      **IMPORTANT**: Keep `watch(timer)` in this specific file because the renderCount variable demonstrates that render() is only called once. If we use auto-reactive html, the atom is auto-wrapped but render() is still only called once. The educational point is preserved either way.
    - **multiple-atoms.ts**: Change import, change `${watch(fullName)}` → `${fullName}`
    - **passing-atoms.ts**: Change import, change `${watch(this.value)}` → `${this.value}`
    - **mixed-reactivity.ts**: Change import, change `${watch(globalCount)}` → `${globalCount}`. Keep `${this.localCount}` as-is (it's a Lit property, not an atom)
    - **async-operations.ts**: Change import. Keep conditional rendering with `atom()` calls as-is (they're used in if/else branches for control flow, not in templates)
  - Also update import line in each file: remove `watch` from `import { ReatomLitElement, watch } from '@reatom/lit'` if watch is no longer used in the file

  **Must NOT do**:
  - Do NOT change files that deliberately show `watch()` usage as part of their teaching (e.g., watch-directive.ts, debugging.ts)
  - Do NOT change the component behavior — only the import style

  **References**:
  - `packages/lit/src/html.ts` — `html` auto-wraps atoms with `watch()` via `isAtom()` check
  - All 5 files listed above

  **Acceptance Criteria**:
  - [ ] All 5 files import `html` from `'@reatom/lit'`
  - [ ] No unnecessary explicit `watch()` calls remain in these files
  - [ ] Components behave identically — auto-reactivity produces same result
  - [ ] `watch` import removed from files that no longer use it

  **Commit**: YES (group with Task 11)
  - Message: `docs(lit): standardize html imports to @reatom/lit`
  - Files: 5 files listed above

---

- [ ] 11. Add @doc-expand annotation to organization.ts

  **What to do**:
  - `best-practices/organization.ts` lines 1-7 use plain `/**` comments without `@doc-expand`:
    ```ts
    /**
     * Organization
     *
     * Recommendations for organizing your Reatom + Lit code
     * ...
     */
    ```
  - All other files use `/** @doc-expand`. Add it:
    ```ts
    /** @doc-expand
     * Organization
     *
     * Recommendations for organizing your Reatom + Lit code
     * ...
     */
    ```
  - Also check if other comment blocks in the file that should be `@doc-expand` are missing it (lines 9, 57, etc.)

  **Must NOT do**:
  - Do NOT change the content of the comments — only add the annotation

  **References**:
  - `packages/lit/docs/best-practices/organization.ts:1-7` — Missing @doc-expand
  - `packages/lit/docs/DOC_EXPAND_GUIDE.md` — Guide for @doc-expand annotation usage

  **Acceptance Criteria**:
  - [ ] Opening comment block has `@doc-expand` annotation
  - [ ] All major section comments that should generate documentation have `@doc-expand`
  - [ ] Doc generation processes the file correctly after fix

  **Commit**: YES (group with Task 10)
  - Files: `packages/lit/docs/best-practices/organization.ts`

---

### Wave 4: Regenerate

- [ ] 12. Regenerate markdown documentation

  **What to do**:
  - Run `pnpm run docs:gen` from the repository root to regenerate all markdown files
  - Verify the generated output in `docs/src/content/docs/handbook/lit/` reflects the changes

  **Must NOT do**:
  - Do NOT manually edit generated markdown files
  - Do NOT change the generation script

  **References**:
  - `docs/src/content/docs/handbook/lit/` — Output directory
  - Root `package.json` — Contains `docs:gen` script

  **Acceptance Criteria**:
  - [ ] `pnpm run docs:gen` completes without errors
  - [ ] Generated files in `docs/src/content/docs/handbook/lit/` are updated
  - [ ] Cross-reference links in generated markdown are valid paths

  **Commit**: YES
  - Message: `docs(lit): regenerate markdown after audit fixes`
  - Files: `docs/src/content/docs/handbook/lit/**/*.md`

---

## Commit Strategy

| After Tasks | Message | Files | Verification |
|-------------|---------|-------|--------------|
| 1-4 | `fix(docs/lit): correct watch() misuse and misleading comments in code examples` | component-composition.ts, memory.ts, debugging.ts | TypeScript validity |
| 5-9 | `docs(lit): deduplicate content and add cross-references` | performance.ts, auto-reactivity.ts, organization.ts, benefits.ts, debugging.ts | Content review |
| 10-11 | `docs(lit): standardize html imports and fix annotations` | reactive-component.ts, multiple-atoms.ts, passing-atoms.ts, mixed-reactivity.ts, async-operations.ts, organization.ts | Import consistency |
| 12 | `docs(lit): regenerate markdown after audit fixes` | docs/src/content/docs/handbook/lit/**/*.md | docs:gen succeeds |

---

## Success Criteria

### Verification Commands
```bash
# After all edits, before commit:
pnpm run docs:gen  # Expected: completes without errors

# Verify generated files exist:
ls docs/src/content/docs/handbook/lit/**/*.md  # Expected: 27 files
```

### Final Checklist
- [ ] All 4 critical code bugs fixed (C1-C4)
- [ ] All 5 deduplication tasks completed (D1-D5) with cross-references
- [ ] Import consistency across all files
- [ ] @doc-expand annotation on organization.ts
- [ ] Markdown successfully regenerated
- [ ] No new content added beyond cross-references and bug fixes
