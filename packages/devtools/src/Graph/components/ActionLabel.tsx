import { AtomMut } from '@reatom/framework'
import { h, hf, JSX } from '../../jsx'
import { buttonCss } from '../../utils'
import { Checkbox } from './Checkbox'

type ActionLabelProps = JSX.IntrinsicElements['label'] & { model: AtomMut<boolean> }

export const ActionLabel = ({
  model,
  children,
  ...props
}: ActionLabelProps) => (
  <label
    {...props}
    css={`
      ${buttonCss}
      flex-shrink: 0;
      width: 95px;
      padding: 2px 6px 2px 2px;
      /* TODO : fix this */
      &:has(input:focus) {
        border: 2px solid #151134;
      }
      ${props.css || ''}
    `}
  >
    <Checkbox model:checked={model} />
    {children as any}
  </label>
)
