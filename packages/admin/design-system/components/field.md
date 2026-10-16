---
sourcesHash: 62010d3b72f23cfdb204f62d5490ad0434df1d7b0b4fbf9d06580865278c0e16
id: field
description: >-
  Collect one search string, one choice from a known option list, or one
  number. Search and select expose the label to assistive tech and hide the
  visible label. The number field shows its label.
status: discoverable
sources:
  - src/view/design-system/Field.tsx
examples:
  - src/stories/design-system/controls.stories.tsx
---

# Field

## When to use

- The person types a search string that filters what is already on screen. Use `SearchField`. The value is a string atom.
- The person picks exactly one value from a known list of options. Use `SelectField`. The value is an atom of that option's string.
- The person enters one number, with an optional minimum and step. Use `NumberField`. The caller reads the current number or an empty field and handles the change.

Use one field per value. Name search and value search are two `SearchField`s.

## When not to use

- An on/off filter. Use [Button](./button.md) with `pressed` and `variant="ghost"`.
- A multi-line note or a filter language with several tokens. That editor stays product UI. [Disclosure](./disclosure.md) can hide it.
- A keyboard chord that is not the shortcut inside the search field. Use [Kbd](./kbd.md). SearchField still draws its own shortcut; that split is [a recorded gap](../gaps.md#searchfield-draws-its-own-shortcut-instead-of-kbd).

## Public API

Import `SearchField`, `SelectField`, and `NumberField` from `src/view/design-system`.

```tsx
<SearchField value={nameQuery} label="Name" placeholder="Name" shortcut="" />
```

- `SearchField` `value` is the string atom. `label` is the accessible name. `placeholder` is the hint in the empty field. `shortcut` is the visible chord inside the field, default `⌘K`; pass an empty string to hide it. `testId` sets `data-testid`.
- `SelectField` `value` is the atom. `label` is the accessible name. `options` is `{ value, label }[]`, or a function that returns that list, in the order shown. The caller owns which values are legal.
- `NumberField` `label` is the visible label and the accessible name. `value` reads a number or `''`. `onChange` receives the next number or `''` when the field is cleared. `min`, `step`, and `placeholder` follow the native number input. Invalid text is ignored.

The search field shows a decorative search icon. Tokens come from [tokens.ts](../../src/view/design-system/tokens.ts).

## Behaviour and states

Search and select bind the atom with `model:value`, so typing and picking update that atom. Number changes run `onChange` from the input event. An empty number field reports `''`. A non-integer entry does not call `onChange`.

The search shortcut is not a control. It does not focus the field.

## Accessibility

`SearchField` and `SelectField` set `aria-label` from `label` and hide a duplicate visible label. `NumberField` shows `label` beside the input. The caller writes `label` as the value's name, such as "Name" or "Value". Placeholder text is not the name.
