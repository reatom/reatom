import { h, hf, JSX } from '../../jsx'
import { buttonCss } from '../../utils'

export const ActionButton = (props: JSX.IntrinsicElements['button']) => (
  <button
    {...props}
    css={`
      ${buttonCss}
      flex-shrink: 0;
      width: 95px;
      ${props.css || ''}
    `}
  />
)
