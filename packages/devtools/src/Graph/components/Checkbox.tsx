import { h, hf, JSX } from '../../jsx'

export const Checkbox = (props: JSX.IntrinsicElements['input']) => (
  <input
    {...props}
    css={`
      position: relative;
      margin-right: 5px;
      &:before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        border-radius: 2px;
        background: #e1e0eb;
        border: 1px solid #151134;
      }
      &:checked:after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        background: #151134;
        clip-path: polygon(14% 44%, 0 65%, 50% 90%, 90% 16%, 70% 0%, 43% 62%);
      }
      ${props.css || ''}
    `}
  />
)
