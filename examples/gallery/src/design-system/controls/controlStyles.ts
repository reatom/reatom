import {
  CONTROL_ROLES,
  CONTROL_SURFACES,
  type ControlRole,
  type ControlSize,
  type ControlSurface,
} from '../themeTypes'

const bindLocalVars = (surface: string, role: string) => {
  const prefix = `--ui-${surface}-${role}`
  return `
    --_fg: var(${prefix}-rest-fg);
    --_bg: var(${prefix}-rest-bg);
    --_border: var(${prefix}-rest-border);
    --_shadow: var(${prefix}-rest-shadow);
    --_image: var(${prefix}-rest-image);
    --_hover-fg: var(${prefix}-hover-fg);
    --_hover-bg: var(${prefix}-hover-bg);
    --_hover-border: var(${prefix}-hover-border);
    --_hover-shadow: var(${prefix}-hover-shadow);
    --_hover-image: var(${prefix}-hover-image);
    --_press-fg: var(${prefix}-press-fg);
    --_press-bg: var(${prefix}-press-bg);
    --_press-border: var(${prefix}-press-border);
    --_press-shadow: var(${prefix}-press-shadow);
    --_press-image: var(${prefix}-press-image);
    --_selected-fg: var(${prefix}-selected-fg);
    --_selected-bg: var(${prefix}-selected-bg);
    --_selected-border: var(${prefix}-selected-border);
    --_selected-shadow: var(${prefix}-selected-shadow);
    --_selected-image: var(${prefix}-selected-image);
    --_selected-hover-fg: var(${prefix}-selected-hover-fg);
    --_selected-hover-bg: var(${prefix}-selected-hover-bg);
    --_selected-hover-border: var(${prefix}-selected-hover-border);
    --_selected-hover-shadow: var(${prefix}-selected-hover-shadow);
    --_selected-hover-image: var(${prefix}-selected-hover-image);
    --_selected-press-fg: var(${prefix}-selected-press-fg);
    --_selected-press-bg: var(${prefix}-selected-press-bg);
    --_selected-press-border: var(${prefix}-selected-press-border);
    --_selected-press-shadow: var(${prefix}-selected-press-shadow);
    --_selected-press-image: var(${prefix}-selected-press-image);
    --_disabled-fg: var(${prefix}-disabled-fg);
    --_disabled-bg: var(${prefix}-disabled-bg);
    --_disabled-border: var(${prefix}-disabled-border);
    --_disabled-shadow: var(${prefix}-disabled-shadow);
    --_disabled-image: var(${prefix}-disabled-image);
    --_focus-color: var(${prefix}-focus-color);
    --_focus-width: var(${prefix}-focus-width);
    --_focus-offset: var(${prefix}-focus-offset);
    --_focus-style: var(${prefix}-focus-style);
    --_radius: var(${prefix}-radius);
    --_border-width: var(${prefix}-border-width);
    --_border-style: var(${prefix}-border-style);
    --_gap: var(${prefix}-gap);
    --_icon-size: var(${prefix}-icon-size);
    --_font-family: var(${prefix}-font-family);
    --_font-weight: var(${prefix}-font-weight);
    --_letter-spacing: var(${prefix}-letter-spacing);
    --_text-transform: var(${prefix}-text-transform);
    --_duration: var(${prefix}-duration);
    --_easing: var(${prefix}-easing);
  `
}

const bindSizeVars = (surface: string, role: string) => {
  const prefix = `--ui-${surface}-${role}`
  return `
    --_pad-x: var(${prefix}-pad-x);
    --_pad-y: var(${prefix}-pad-y);
    --_min-height: var(${prefix}-min-height);
    --_font-size: var(${prefix}-font-size);
  `
}

const roleBindings = () =>
  CONTROL_SURFACES.flatMap((surface) =>
    CONTROL_ROLES.map((role) => {
      const selector =
        role === 'switch'
          ? `[data-ui="switch"][data-ui-surface="${surface}"]`
          : `[data-ui="button"][data-ui-role="${role}"][data-ui-surface="${surface}"]`
      const sizeVars = role === 'switch' ? bindSizeVars(surface, role) : ''
      return `${selector} { ${bindLocalVars(surface, role)}${sizeVars} }`
    }),
  ).join('\n')

const sizeOverrideCss = (size: ControlSize) => {
  if (size === 'sm') {
    return `
      --_min-height: 28px;
      --_pad-x: 10px;
      --_pad-y: 5px;
    `
  }
  if (size === 'lg') {
    return `
      --_min-height: 48px;
      --_pad-x: 26px;
      --_pad-y: 13px;
      --_font-size: 16px;
    `
  }
  if (size === 'icon') {
    return `
      width: var(--_min-height);
      height: var(--_min-height);
      min-width: 0;
      min-height: 0;
      padding: 0;
    `
  }
  return ''
}

export const composeControlCss = (
  surface: ControlSurface,
  role: Exclude<ControlRole, 'switch'>,
  size: ControlSize,
  consumerCss?: string,
) => `${bindSizeVars(surface, role)}${sizeOverrideCss(size)}${consumerCss ?? ''}`

const paintTransition = import.meta.env.TEST
  ? 'none'
  : `color var(--_duration) var(--_easing),
      background-color var(--_duration) var(--_easing),
      background-image var(--_duration) var(--_easing),
      border-color var(--_duration) var(--_easing),
      box-shadow var(--_duration) var(--_easing)`

export const controlRecipeCss = () => `
  ${roleBindings()}

  [data-ui="button"],
  [data-ui="switch"] {
    appearance: none;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--_fg);
    background-color: var(--_bg);
    background-image: var(--_image);
    border: var(--_border-width) var(--_border-style) var(--_border);
    border-radius: var(--_radius);
    box-shadow: var(--_shadow);
    line-height: 1;
    cursor: pointer;
    outline: none;
    font-family: var(--_font-family);
    font-size: var(--_font-size);
    font-weight: var(--_font-weight);
    letter-spacing: var(--_letter-spacing);
    text-transform: var(--_text-transform);
    transition: ${paintTransition};
  }

  :where([data-ui="button"], [data-ui="switch"]) {
    gap: var(--_gap);
    min-height: var(--_min-height);
    padding: var(--_pad-y) var(--_pad-x);
  }

  [data-ui="button"] svg {
    flex-shrink: 0;
    width: var(--_icon-size);
    height: var(--_icon-size);
  }

  [data-ui="button"][data-ui-slot="overlay"] {
    --_fg: var(--ui-overlay-rest-fg);
    --_bg: var(--ui-overlay-rest-bg);
    --_border: var(--ui-overlay-rest-border);
    --_shadow: var(--ui-overlay-rest-shadow);
    --_image: var(--ui-overlay-rest-image);
    --_hover-fg: var(--ui-overlay-hover-fg);
    --_hover-bg: var(--ui-overlay-hover-bg);
    --_hover-border: var(--ui-overlay-hover-border);
    --_hover-shadow: var(--ui-overlay-hover-shadow);
    --_hover-image: var(--ui-overlay-hover-image);
    --_press-fg: var(--ui-overlay-press-fg);
    --_press-bg: var(--ui-overlay-press-bg);
    --_press-border: var(--ui-overlay-press-border);
    --_press-shadow: var(--ui-overlay-press-shadow);
    --_press-image: var(--ui-overlay-press-image);
    --_selected-fg: var(--ui-overlay-selected-fg);
    --_selected-bg: var(--ui-overlay-selected-bg);
    --_selected-border: var(--ui-overlay-selected-border);
    --_selected-shadow: var(--ui-overlay-selected-shadow);
    --_selected-image: var(--ui-overlay-selected-image);
    --_selected-hover-fg: var(--ui-overlay-selected-hover-fg);
    --_selected-hover-bg: var(--ui-overlay-selected-hover-bg);
    --_selected-hover-border: var(--ui-overlay-selected-hover-border);
    --_selected-hover-shadow: var(--ui-overlay-selected-hover-shadow);
    --_selected-hover-image: var(--ui-overlay-selected-hover-image);
    --_selected-press-fg: var(--ui-overlay-selected-press-fg);
    --_selected-press-bg: var(--ui-overlay-selected-press-bg);
    --_selected-press-border: var(--ui-overlay-selected-press-border);
    --_selected-press-shadow: var(--ui-overlay-selected-press-shadow);
    --_selected-press-image: var(--ui-overlay-selected-press-image);
  }

  [data-ui="button"][data-ui-selected="true"],
  [data-ui="switch"][data-ui-selected="true"] {
    color: var(--_selected-fg);
    background-color: var(--_selected-bg);
    background-image: var(--_selected-image);
    border-color: var(--_selected-border);
    box-shadow: var(--_selected-shadow);
  }

  @media (hover: hover) and (pointer: fine) {
    [data-ui="button"]:hover:not(:disabled):not([data-ui-selected="true"]),
    [data-ui="switch"]:hover:not(:disabled):not([data-ui-selected="true"]) {
      color: var(--_hover-fg);
      background-color: var(--_hover-bg);
      background-image: var(--_hover-image);
      border-color: var(--_hover-border);
      box-shadow: var(--_hover-shadow);
    }

    [data-ui="button"][data-ui-selected="true"]:hover:not(:disabled),
    [data-ui="switch"][data-ui-selected="true"]:hover:not(:disabled) {
      color: var(--_selected-hover-fg);
      background-color: var(--_selected-hover-bg);
      background-image: var(--_selected-hover-image);
      border-color: var(--_selected-hover-border);
      box-shadow: var(--_selected-hover-shadow);
    }
  }

  [data-ui="button"]:active:not(:disabled):not([data-ui-selected="true"]),
  [data-ui="switch"]:active:not(:disabled):not([data-ui-selected="true"]) {
    color: var(--_press-fg);
    background-color: var(--_press-bg);
    background-image: var(--_press-image);
    border-color: var(--_press-border);
    box-shadow: var(--_press-shadow);
  }

  [data-ui="button"][data-ui-selected="true"]:active:not(:disabled),
  [data-ui="switch"][data-ui-selected="true"]:active:not(:disabled) {
    color: var(--_selected-press-fg);
    background-color: var(--_selected-press-bg);
    background-image: var(--_selected-press-image);
    border-color: var(--_selected-press-border);
    box-shadow: var(--_selected-press-shadow);
  }

  [data-ui="button"]:disabled,
  [data-ui="switch"]:disabled {
    color: var(--_disabled-fg);
    background-color: var(--_disabled-bg);
    background-image: var(--_disabled-image);
    border-color: var(--_disabled-border);
    box-shadow: var(--_disabled-shadow);
    cursor: not-allowed;
    opacity: 0.62;
  }

  [data-ui="button"]:focus-visible,
  [data-ui="switch"]:focus-visible {
    outline: var(--_focus-width) var(--_focus-style) var(--_focus-color);
    outline-offset: var(--_focus-offset);
  }

  [data-ui="switch"] {
    --_switch-width: var(--ui-app-switch-width, 40px);
    --_switch-height: var(--ui-app-switch-height, 22px);
    --_switch-knob-size: var(--ui-app-switch-knob-size, 18px);
    --_knob: var(--ui-app-switch-knob);
    --_knob-checked: var(--ui-app-switch-knob-checked);
    --_inner-height: max(0px, calc(var(--_switch-height) - (2 * var(--_border-width))));
    --_knob-fit: min(var(--_switch-knob-size), max(0px, calc(var(--_inner-height) - 2px)));
    --_knob-inset: max(1px, calc((var(--_inner-height) - var(--_knob-fit)) / 2));
    position: relative;
    width: var(--_switch-width);
    height: var(--_switch-height);
    min-height: var(--_switch-height);
    padding: 0;
    flex-shrink: 0;
    border-radius: var(--_radius);
  }

  [data-ui="switch"][data-ui-surface="viewer"] {
    --_switch-width: var(--ui-viewer-switch-width, 40px);
    --_switch-height: var(--ui-viewer-switch-height, 22px);
    --_switch-knob-size: var(--ui-viewer-switch-knob-size, 18px);
    --_knob: var(--ui-viewer-switch-knob);
    --_knob-checked: var(--ui-viewer-switch-knob-checked);
  }

  [data-ui="switch"]::after {
    content: '';
    position: absolute;
    top: 50%;
    left: var(--_knob-inset);
    width: var(--_knob-fit);
    height: var(--_knob-fit);
    border-radius: inherit;
    background: var(--_knob);
    box-shadow: 0 2px 6px var(--shadow);
    transform: translateY(-50%);
    transition: transform var(--_duration) var(--_easing), background-color var(--_duration) var(--_easing);
    pointer-events: none;
  }

  [data-ui="switch"][data-ui-selected="true"]::after {
    background: var(--_knob-checked);
    transform: translate(
      calc(var(--_switch-width) - var(--_knob-fit) - (2 * var(--_knob-inset)) - (2 * var(--_border-width))),
      -50%
    );
  }

  @media (prefers-reduced-motion: reduce) {
    [data-ui="button"],
    [data-ui="switch"],
    [data-ui="switch"]::after {
      transition: none;
    }
  }

  @media (forced-colors: active) {
    [data-ui="button"],
    [data-ui="switch"] {
      color: ButtonText;
      background-color: ButtonFace;
      background-image: none;
      border-color: ButtonText;
    }
    [data-ui="button"][data-ui-selected="true"],
    [data-ui="switch"][data-ui-selected="true"] {
      color: HighlightText;
      background-color: Highlight;
      border-color: Highlight;
    }
    [data-ui="button"]:focus-visible,
    [data-ui="switch"]:focus-visible {
      outline-color: Highlight;
      box-shadow: none;
    }
    [data-ui="button"]:disabled,
    [data-ui="switch"]:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`

const RECIPE_STYLE_ID = 'gallery-control-recipe'

export const bindControlRecipe = () => {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(RECIPE_STYLE_ID)
  const css = controlRecipeCss()
  if (existing instanceof HTMLStyleElement) {
    existing.textContent = css
    return
  }
  const style = document.createElement('style')
  style.id = RECIPE_STYLE_ID
  style.textContent = css
  document.head.append(style)
}

bindControlRecipe()
