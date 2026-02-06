import { Atom, atom } from '@reatom/framework'
import { h, hf } from '../jsx'
import { Lines } from '../Graph/reatomLines'

type GraphSVGProps = { listHeight: Atom<string>; lines: Lines }

export const GraphSVG = ({ listHeight, lines }: GraphSVGProps) => (
  <svg:svg
    css:height={listHeight}
    css:pe={atom((ctx) => (ctx.spy(lines).size ? 'auto' : 'none'))}
    css={`
      position: absolute;
      width: calc(100% - 70px);
      height: var(--height);
      top: 0;
      left: 60px;
      pointer-events: var(--pe);
      will-change: height;
      z-index: 1;
    `}
  >
    {lines}
  </svg:svg>
)
