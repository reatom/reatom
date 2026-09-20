# Gallery theme visual audit

Inspected live at `http://localhost:5173/` (dev server; `:5175` was refused). Viewport **1644×1092**. Folder `png-formats` (11 PNGs). Grid: 4 columns, medium gap, cover, names on. Mode unless noted: **dark**.

Screens per pack: default, filters open, settings open, lightbox open, image details open.

## Cross-cutting

| Severity | Finding |
| --- | --- |
| High | Filters and Settings share `z-index: 1000` with `#gallery-lightbox` and mount after it in `App.tsx`, so an open panel covers the lightbox (Close preview hidden; photo clipped). |
| High | Image details (`z-index: 1050`, 300px) covers the Next control and ~200×812 of the print. Only the lightbox toolbar gets `margin-right: 300px`; the stage does not shrink. Two close buttons sit at the seam. |
| Medium | Settings is 320px. Grid Gap (5 chips) and Image Fit (4 chips) wrap: last chip(s) drop to a second row. Cartoon 3px ink borders make this worse. Slider value `4` sits tight against the panel close control. |
| Medium | Open Filters/Settings cover the 4th grid column (fixed overlay, no content inset). |
| Low | Folder-tree toggle is centered on the sidebar/pathbar seam (`translateX(-50%)`, ~17×34 overlap). Reads as a border nick when the rail has a hard edge. |
| Low | Closed panels stay in the a11y tree (`inert`). Lightbox chrome fades after 2.5s (`pointer-events: none`). |

## Pack status

| Pack | Default | Filters | Settings | Lightbox | Details | Light |
| --- | --- | --- | --- | --- | --- | --- |
| cartoon | done | done | done | done | done | pending |
| blueprint | done | done | done | done | done | pending |
| terminal | done | pending | done | pending | pending | pending |
| paper | done | pending | pending | pending | pending | pending |
| polaroid | done | done | done | done | measured | pending |
| obsidian | settings only | pending | done | pending | pending | pending |
| bauhaus | done | done | done | done | done | pending |
| glass | done | done | done | done | done | pending |
| minimal | done | done | done | done | done | pending |
| retroOs | pending | pending | done | pending | pending | pending |

## Cartoon (dark)

- Default: pill toolbar, 3px ink borders, 6px root inset vs flush fixed panels.
- Settings: Gap/Fit wrap; slider `4` tight to close.
- Filters: native checkboxes vs ink language.
- Lightbox: generic chrome; filmstrip under the image.
- Details: panel covers Next / print (cross-cutting). Filters-over-lightbox confirmed.

## Blueprint (dark)

- Default: wordmark “Blueprint”; numbered captions; footer status; “N 1” compass/poem in canvas can collide with bottom-left cards.
- Settings / Filters: blue sheet, weak left rule; Gap/Fit wrap.
- Lightbox / Details: same overlay stacking as above.

## Terminal (dark)

- Default: `[OPEN]` brackets, hard edges; grid clean.
- Settings: Gap/Fit wrap with bracket chrome.
- Filters / Lightbox / Details: not captured yet.

## Paper (dark)

- Default: clean; no obvious glitches.
- Other screens: not captured yet.

## Polaroid (dark)

- Default: “Instant” wordmark; coral toolbar stripe; manila folder + drawer pull; white frames + tape on some cards.
- Settings / Filters: plain dark panel — disconnect from print language.
- Lightbox: large polaroid frame, tape counter, caption on white border.
- Details: CDP — Next at `x=1580 w=48` fully under details `left=1344`. Screenshot failed after tool stack overflow.

## Obsidian (dark) — in progress

- Settings (1644×1092): Gothic wordmark + gem mark; “Collections” rail label; mineral gem at sidebar bottom; taller toolbar (79px) and pathbar (50px).
- Gap wraps `none/small/medium` then `large/xl`. Fit wraps `contain/cover/fill` then `none`.
- Settings covers 4th column. Theme list descriptions wrap tightly in 320px.
- Footer `ObsidianFooter` is `display: none` (status exists in a11y, not painted).
- Default / Filters / Lightbox / Details: pending.

## Bauhaus (dark)

- Default: tricolor toolbar `border-image` (red / yellow / blue then ink). Circle brand. Caption dots (circle/square/triangle) sit on the card footer. Pathbar sits on the color rule; folder toggle nicks the seam.
- “Look closer. / THERE’S MORE TO SEE.” is `BauhausSidebarPrint` at sidebar bottom (`195×247` at `22,817`). No card overlap with this corpus.
- Settings: flat dark panel; 2px ink left rule. Gap/Fit wrap. Theme copy wraps tightly.
- Filters: 300px overlay covers column 4. Native checkboxes vs primary-block language. Search + min/max fields are generic.
- Lightbox: generic chrome; `background: rgba(0,0,0,0.9)` — sidebar print can ghost through at ~10%. Filmstrip under the image.
- Details: Next fully covered (`48×48` at `1580,522` under panel `left=1344`). Image overlap `220×835`. Two close controls at the seam. Stage does not shrink.

## Glass (dark)

- Default: pill toolbar + rounded sidebar. Sidebar is not full-height — rounded foot leaves a dark pocket at the bottom-left. Folder toggle sits on the rounded seam. Cards are rounded tiles; captions overlay the image (gradient). Closed asides use `right: -24px` plus `translateX(100%)` — fully off-screen (`left=1668`, `visibleW=0`).
- Settings: floating 34px-radius lens, inset (`x=1312`, not flush). Gap/Fit wrap. Extra **Animate Glass Background** switch. Theme list copy wraps.
- Filters: floating 26px-radius card `340×522` at `(1292, 92)` — covers only the upper-right of column 4, not the full rail. Checkboxes wrap two columns. Cleaner than full-height overlays.
- Lightbox: glass chrome (pill toolbar, rounded filmstrip). Image nearly full-bleed.
- Details: inset card `300×1068` at `(1284, 12)`, radius 34px. Next fully covered (`60×60` at `1520,516`). Image overlap `232×808` — worse than flush 300px panels because of the 12px inset. Two close controls. Filmstrip remains visible under the card.

## Minimal (dark)

- Selecting this pack **mutates prefs**: Image Fit → `contain`, Show Image Names off. Those persist after leaving the pack.
- Default: hairline chrome. Pathbar is **132px** with a huge folder title (`png-formats`). Folder toggle uses `--folder-header-rail-height: 98px` so it sits at `y=120` (top of the 132px rail), ~17px above optical center. Sidebar labeled “LIBRARY”. Cards letterbox under `contain`; no captions.
- Content is inset (~48px): toolbar `1596` wide on a `1644` viewport; panels start at `x=1296`.
- Settings: Gap/Fit wrap. Flush black sheet.
- Filters: 300px full-height hairline rail covers column 4.
- Lightbox: sparse chrome; filmstrip under the image.
- Details: Next fully covered (`48×48` at `1532,522`). Image overlap `220×808`. Two close controls.

## Retro OS (dark) — in progress

- Settings (pre-reload): teal/cyan sheet vs navy canvas. No Win3 title bar (that chrome is light-only). Gap/Fit wrap. Theme list copy wraps.
- Default: Win3 palette — cyan toolbar, navy desktop, white captions **above** tiles, 1px grid rules. Wordmark “Gallery • Photo Explorer”. Folder toggle on the seam. No title-bar chrome in dark.
- Filters / Lightbox / Details: pending.
