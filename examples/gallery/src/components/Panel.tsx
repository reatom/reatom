import type { JSX } from '@reatom/jsx'

import { IconButton } from '../design-system'
import {
  type ReactiveBoolean,
  resolveReactiveBoolean,
} from '../design-system/controls/shared'
import { registerGlassSurface } from '../glassSurfaces'
import { bindRefs, modeAttr, packAttr } from '../themeAttrs'
import { CloseIcon } from './Icons'
import { panelMotionTransition } from './panelLayout'

export type PanelProps = {
  label: string
  closeLabel: string
  open: ReactiveBoolean
  onClose: () => void
  width: string
  css?: string
  closeCss?: string
  heading?: JSX.ElementChildren
  children?: JSX.ElementChildren
}

const panelFrameCss = `
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: var(--bg-secondary);
  border-left: var(--border-width) var(--border-style) var(--border);
  z-index: 1000;
  transform: translateX(calc(100% + var(--panel-end-gap, 0px)));
  transition: transform ${panelMotionTransition}, box-shadow ${panelMotionTransition};
  overflow-y: auto;
  padding: 20px;
  box-shadow: none;
  background-color: var(--panel-bg);
  background-image: var(--surface-bg-image);
  background-size: var(--surface-bg-size);
  backdrop-filter: var(--panel-backdrop-filter);
  clip-path: var(--surface-clip-path);

  &[data-open='true'] {
    transform: translateX(0);
    box-shadow: -18px 0 48px var(--shadow-strong);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const panelScrollCss = `
  display: contents;
  ${packAttr.is(
    'glass',
    `
      display: block;
      min-height: 0;
      overflow: auto;
      padding: 12px;
      transform: translateZ(0);
    `,
  )}
`

const panelHeaderCss = `
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  ${packAttr.is(
    'retroOs',
    modeAttr.is(
      'light',
      `
        background: var(--retro-title);
        padding: 3px;
        margin: -15px -15px 20px;
        gap: 8px;
      `,
    ),
  )}
`

export const Panel = ({
  label,
  closeLabel,
  open,
  onClose,
  width,
  css,
  closeCss,
  heading,
  children,
}: PanelProps) => (
  <aside
    role="dialog"
    aria-modal="true"
    aria-label={label}
    aria-hidden={() => !resolveReactiveBoolean(open)}
    prop:inert={() => !resolveReactiveBoolean(open)}
    attr:data-open={() => String(resolveReactiveBoolean(open))}
    ref={registerGlassSurface('panel')}
    css={`
      ${panelFrameCss}
      width: ${width};
      ${css ?? ''}
    `}
  >
    <div ref={packAttr.inherit} css={panelScrollCss}>
      <div
        ref={bindRefs(packAttr.inherit, modeAttr.inherit)}
        css={panelHeaderCss}
      >
        {heading ?? (
          <h2
            css={`
              font-size: 16px;
              font-weight: 600;
              color: var(--text-primary);
            `}
          >
            {label}
          </h2>
        )}
        <IconButton label={closeLabel} onClick={onClose} css={closeCss}>
          <CloseIcon />
        </IconButton>
      </div>
      {children}
    </div>
  </aside>
)
