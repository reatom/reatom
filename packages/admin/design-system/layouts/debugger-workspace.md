---
sourcesHash: 350e38fcdfe4dbfbeaa647134f23350459f3dfd0077b5582ae3b54a95ce5a015
id: debugger-workspace
description: >-
  Arrange the admin shell as a header, filters, a main view, a frame card,
  and a status line. The frame card sits beside the view at 680px of shell
  width and in a bottom drawer below that.
status: discoverable
sources:
  - src/view/design-system/DebuggerWorkspace.tsx
  - src/view/design-system/layer.ts
examples:
  - src/stories/design-system/debugger-workspace.stories.tsx
---

# Debugger workspace

## When to use

- The screen is the admin shell: a header, a filter row, one main view, an optional frame card, and a status line. The shell itself is the width that decides where the frame card sits.

## When not to use

- A single control row with no view. Use [Toolbar](../components/toolbar.md).
- Two regions the person resizes when there is no header, filter, or status. Use [SplitPane](../components/split-pane.md) directly.
- The waterfall, the record filter language, or the live connection. Those stay product UI. This layout only places regions.

## Public API

Import `DebuggerWorkspace` and `DEBUGGER_WORKSPACE_SIDE_MIN` from `src/view/design-system`. `DEBUGGER_WORKSPACE_SIDE_MIN` is 680.

```tsx
<DebuggerWorkspace
  header={header}
  filter={filters}
  main={timeline}
  inspector={() => frameCard}
  inspectorLabel="Frame"
  inspectorOpen={open}
  onInspectorClose={closeCard}
  status={statusBar}
/>
```

- `header`, `filter`, `main`, and `status` are the regions. `main` is one element. The shell reparents it when the card opens, closes, or the shell crosses 680px. Keep view state in atoms.
- `inspector` builds the frame card. It is called when the card is shown and again when the shell crosses 680px. Pass null when there is no card. Keep card state in atoms.
- `inspectorLabel` names the side region and the drawer dialog. Pass a function when the name changes with the view, such as Frame or Step.
- `inspectorOpen` is the caller's atom.
- `onInspectorClose` sets that atom false. The caller also returns focus to the selected row when the drawer did not already restore it.

The shell sets `container: admin-shell`. Product CSS that depends on shell width uses that container, not the viewport.

## Composition

### Required

- Order is header, filters, main view, then status. The frame card is either the right side of a [SplitPane](../components/split-pane.md) or a [Drawer](../components/drawer.md). It is not a third place.
- At a shell `clientWidth` of 680 or more, and while the card is open, the card is the side pane. The left minimum is 280px, the right minimum is 240px, and the default ratio is 0.62. Below 680, the card is the drawer.
- The status region is the caller's [StatusBar](../components/status-bar.md). This layout does not wrap it in another footer.
- Spacing between the stacked regions uses the space and border tokens. The caller does not add a second shell around this one.

### Recommendations

- Put view switches in the header with [Tabs](../components/tabs.md). Put searches and chips in the filter region.
- Let the product Gantt be `main`. Do not extract it into this layout.

### Exceptions

The arrow-key range of the side pane is the [SplitPane gap](../gaps.md#splitpane-keyboard-range-ignores-the-pane-minimums). The layout still passes 280 and 240 as the drag minimums.

## Accessibility

The header is a banner, the filter region is named "Filters", the main view is a `main`, the side card is a complementary region named `inspectorLabel`, and the narrow card is the drawer dialog of that same name. Escape in the wide shell closes the card unless focus is in a text field. Escape in the drawer follows [Drawer](../components/drawer.md). The caller writes the header's heading and the status words.
