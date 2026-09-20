# Gallery view-layer simplification review

Reviewed: 2026-09-19, commit `74f6b2e4` (`docs(gallery): theme system refactor`).

Status: done.

This follows the implemented [design-system refactoring plan](./design-system-refactoring-plan.md). The scope is the gallery view layer: components, theme presentation, control primitives, DOM integration, and supporting stories. Model implementation and image-engine internals are excluded. The gallery is also a playground for `@reatom/jsx`, so a small runtime improvement is appropriate when it solves a demonstrated problem.

The largest simplification is making each component own its complete styling, including theme variations. The current implementation centralizes controls, but leaves a second styling system reaching into components through classes and DOM structure. Finish removing that dependency before introducing more abstractions.

## Findings

### 1. High: nested controls trigger parent keyboard actions — done

[`keyboardActivate`](../src/a11y.ts) now ignores Enter and Space unless `event.target === event.currentTarget`, so the same helper covers cards, rows, and folder items. Lightbox and document Space shortcuts skip native activation targets. `ImageGrid` `NestedControlKeyboard` presses Space on the nested checkbox.

### 2. Medium: button sizes do not work — done

Role size variables are no longer applied at role-selector specificity. [`composeControlCss`](../src/design-system/controls/controlStyles.ts) writes role defaults, then size overrides, then consumer `css` on the control. `ControlStates` and `BlueprintLightSizes` assert `sm` / `md` / `lg` dimensions; the 24px icon still wins over internal icon geometry.

### 3. Medium: grid control visibility depends on the theme — done

[`GridImage`](../src/components/GridImage.tsx) sets `--overlay-opacity` on hover, `:focus-within`, selected, and `@media (hover: none)`. Theme decorations no longer reveal the overlay on focus. `TerminalOverlayFocus` covers card focus and child focus-within.

### 4. Medium: theme decorations still override control paint — done

Theme decorations no longer paint folder-toggle or overlay-control interaction states. Overlay geometry and Glass materials live on [`GridImage`](../src/components/GridImage.tsx). The [decoration boundary test](../src/design-system/themeDecoration.boundary.test.ts) treats `[data-ui]` as a control.

### 5. Medium: story theme isolation is incomplete — done

[`StoryWrapper`](../src/shared/StoryWrapper.tsx) does not write `themePack` / `themeMode`. Branding, footers, Polaroid folder titles, and lightbox chrome read local `themeCss` / ancestor `data-theme-pack` instead of global preferences. `ExplicitThemeDoesNotMutatePreferences` covers the wrapper.

## Remove all manual class names

Done. Gallery view sources have no handwritten `class` / `className` props. Landmark ids (`#gallery-toolbar`, `#gallery-workspace`, `#gallery-lightbox`, …) and existing attributes (`data-gap`, `data-caption`, `data-ui-slot`, ARIA) replace class selectors. [`viewLayer.classNames.test.ts`](../src/viewLayer.classNames.test.ts) keeps that durable.

| Current use | Replacement |
| --- | --- |
| Component identity, such as `.gallery-toolbar` and `.grid-image-caption` | Styles on the owning element's `css` prop, plus unique landmark ids |
| Shared appearance | Imported `css` strings or mixins (`fieldCss`, `lightboxChromeCss`) |
| Selected, expanded, checked states | Existing ARIA or native attributes where semantically appropriate |
| Dynamic dimensions and offsets | `css:*` variables consumed by static CSS |
| Parent-controlled appearance | Inherited custom properties (`--overlay-opacity`, `--control-opacity`) |
| Glass surface discovery through selectors | Explicit `ref` registration with cleanup |
| Theme-specific artwork | [`BauhausArtwork`](../src/components/BauhausArtwork.tsx) and footer components with local `themeCss` |

Keep meaningful attributes such as `data-theme-pack`. Do not replace every class with an equally arbitrary `data-part`; that preserves the same dependency under different spelling. Do not add ARIA attributes solely to obtain styling hooks.

### A small theme helper

Ordinary theme variations use the gallery-local [`themeCss`](../src/themeCss.ts) helper. Theme tokens and control palettes remain centralized data. Component-specific layout and decoration belong with their components.

### Parent–child styling without names

A card sets `--overlay-opacity` on hover and focus, while its overlay consumes the variable. Lightbox chrome consumes `--control-opacity` / `--control-pointer`. Glass surfaces register by ref.

Done. [`registerGlassSurface`](../src/glassSurfaces.ts) takes a `panel` or `viewer` kind. `bindGlassSurfaces` applies optics to registered descendants, and still handles theme switching, resize, and filter cleanup.

## Simplify component structure

| Area | Proposed change | Behavior to preserve |
| --- | --- | --- |
| Buttons | One internal native button implementation with thin `ChoiceButton` and `IconButton` adapters. Class props removed. | Native activation, disabled behavior, selection semantics, labels, focus, and press-mode behavior |
| Panels | Shared [`Panel`](../src/components/Panel.tsx) frame for Settings, Filters, and Image Details | Different positioning, visibility, inertness, scrolling, and theme materials |
| Inputs | Shared [`fieldCss`](../src/components/fieldStyles.ts) for toolbar search and filter fields | Existing model actions, bindings, empty-value handling, and focus feedback |
| Image views | Shared [`ImageSelectButton`](../src/components/ImageControls.tsx) / `ImageFavoriteButton` | Preview priorities, orientation handling, labels, propagation, and fresh DOM nodes |
| Grid/list traversal | [`FolderImageTree`](../src/components/FolderImageTree.tsx); table rows use `mapFolderImages` | Existing preview lifetimes, folder scope, visibility, and ordering |
| Lightbox | `--control-opacity` chrome, named landmark ids for toolbar / stage / filmstrip / scrubber | Canvas ownership, documented preview fallbacks, focus, fullscreen behavior, and session cleanup |
| Theme data | Registry entries already hold metadata, decorative tokens, and control overrides | Complete resolved control states, both modes, viewer aliases, and visual identity |
| Artwork and icons | Bauhaus empty/sidebar art and footer styles colocated with their components | Fresh element creation and SVG namespace semantics |

Avoid a general polymorphic component framework or a utility-class replacement.

### Narrow reactive children

Done. [`ImageTableFilters`](../src/components/ImageTableFilters.tsx) binds column checked state per checkbox.

### Let CSS own responsive geometry

Done. [`FolderTree`](../src/components/FolderTree.tsx) positions the sidebar and toggle from inherited `--sidebar-width`, `--folder-toggle-size`, and `--folder-header-rail-height`.

### Remove leftovers

- Done. Removed unused `GlobalStyles` from [`theme.tsx`](../src/theme.tsx).
- Done. Removed unused `resolveReactiveString` from [`controls/shared.ts`](../src/design-system/controls/shared.ts).
- Done. Removed the obsolete `.glass-scene` selector from [`GlassDetails`](../src/components/GlassDetails.ts).
- Done. Settings switches pass atoms directly.
- Done. Toolbar uses [`ThemeToggle`](../src/components/ThemeToggle.tsx).
- Done. [`pressEvents`](../src/design-system/controls/pressEvents.ts) lives next to activation handling.

## Small JSX runtime improvement to consider

The object-form `style` binding currently sets supplied keys but does not remove keys omitted from a later value. `ThemeRoot` compensates with `clearedOptionalTokens`.

Treat this as a separate, focused runtime change. No runtime extension was required to remove the gallery's class names.

## Implementation order

1. Done. Keyboard, size, and overlay-visibility regressions plus focused browser coverage.
2. Done. `ChoiceButton` and `IconButton` are thin adapters over one `Button`. Settings, Filters, and Image Details share [`Panel`](../src/components/Panel.tsx).
3. Done. [`themeCss`](../src/themeCss.ts) supports pack and optional mode. Components own brand, footer, overlay, and field variations.
4. Done. [`registerGlassSurface`](../src/glassSurfaces.ts) registers toolbar, sidebar, panels, and lightbox chrome.
5. Done. Explicit story themes do not mutate preferences or mix global presentation reads.
6. Done. Image controls and folder traversal are shared. Table filters bind per checkbox.
7. Consider the `style` object runtime improvement separately so its semantics and validation remain reviewable.

The model API and image decoding behavior stay outside this refactoring. In particular, preserve the Lightbox comments and behavior explaining why a pending sized decode must not fall back to an undecoded full image.

## Validation evidence and follow-up

Targeted suites after this pass:

```sh
pnpm --filter gallery exec vitest run --project=unit \
  src/a11y.test.ts \
  src/themeCss.test.ts \
  src/glassSurfaces.test.ts \
  src/viewLayer.classNames.test.ts \
  src/models/keyboardShortcuts.test.ts \
  src/design-system

pnpm --filter gallery exec vitest run --project=storybook \
  src/design-system/controls/ControlStates.stories.tsx \
  src/design-system/themes/ThemeMatrix.stories.tsx \
  src/shared/StoryWrapper.stories.tsx \
  src/components/SettingsPanel.stories.tsx \
  src/components/FilterPanel.stories.tsx \
  src/components/ImageGrid.stories.tsx \
  src/components/FolderTree.stories.tsx \
  src/shortcuts.stories.tsx
```

Model and image-engine tests remain outside scope.

## Completion criteria

- Gallery view code has no handwritten class props, class selectors, or class-based DOM behavior.
- Component appearance is understandable from its local CSS, shared mixins, and theme tokens.
- Theme decorations do not override control interaction paint through ancestor selectors.
- Native and nested control activation works consistently with mouse and keyboard.
- Supported button sizes produce their intended dimensions.
- Grid controls remain discoverable through keyboard focus and touch interaction.
- Explicitly themed specimens do not mutate global preferences or mix local and global presentation themes.
- Reactive property updates preserve existing control nodes where structure has not changed.
- All themes retain their visual identity, and model behavior remains unchanged.
