---
sourcesHash: 2903db9e7e3dfd987a3cacac9f80ff845c45a66ccba86ef446c3ff5dc53f0553
id: drawer
description: >-
  Cover the bottom of the current shell with a dialog the person can dismiss.
  The dialog stays in the tree that mounted it, including a shadow root.
status: discoverable
sources:
  - src/view/design-system/Drawer.tsx
  - src/view/design-system/layer.ts
examples:
  - src/stories/design-system/overlays.stories.tsx
---

# Drawer

## When to use

- A secondary panel must cover the bottom of the shell and close on Escape, returning focus to the control that opened it.
- The shell is narrower than the [debugger workspace](../layouts/debugger-workspace.md) side-panel width and the frame card cannot sit beside the main view.

Place the drawer inside a positioned shell. The workspace provides that shell.

## When not to use

- The shell is wide enough to keep the panel beside the main view. Use [SplitPane](./split-pane.md) through [debugger workspace](../layouts/debugger-workspace.md).
- A message that disappears on its own. Use [Toast](./toast.md).
- A short note anchored to one control. Use [Popover](./popover.md).

## Public API

Import `Drawer` from `src/view/design-system`.

```tsx
<Drawer open={open} label="Frame" onClose={() => open.set(false)}>
  {card}
</Drawer>
```

- `open` reads whether the dialog is shown. Pass the caller's atom.
- `label` is the dialog name and the visible heading. A string is static. A function is rendered as a reactive child, so the heading can follow the selection without remounting the dialog.
- `onClose` runs for Escape, Dismiss, and Close. The caller sets `open` false.
- `children` is the panel body.

The component does not move its node to `document.body`.

## Behaviour and states

While `open` is false, nothing is shown. While open, a scrim covers the shell and the panel occupies the bottom 70% of the shell. The heading stays visible while the bounded body scrolls; an editor may divide that body into scrolling content and a pinned footer. Escape, Close, and Dismiss call `onClose`. Focus moves to Close when the dialog opens and returns to the previously focused element when it closes, if that element is still connected. When drawers overlap, the most recently mounted open drawer paints on top. Covered drawers are inert; only the top drawer handles Escape and Tab. Closing it restores focus inside the remaining top drawer, or to its opener when no drawer remains. Tab stays inside the dialog. A transition on the panel is removed under reduced motion.

## Accessibility

The component sets `role="dialog"`, `aria-modal="true"`, and names the dialog from the heading. Close and Dismiss are buttons. The caller writes `label` and does not trap focus a second time.
