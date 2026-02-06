import { h, hf, JSX } from '../../jsx'

type FilterButtonProps = JSX.IntrinsicElements['button'] & { 'css:background': string }

export const FilterButton = (props: FilterButtonProps) => (
  <button
    {...props}
    css={`
      width: 30px;
      height: 30px;
      padding: 0;
      margin-right: 5px;
      display: flex;
      justify-content: center;
      align-items: center;

      background: var(--background);
      background-size: 80%;
      background-repeat: no-repeat;
      background-position: center;

      border: 2px solid #151134;
      border-radius: 2px;

      &:outline: none;

      &:focus,
      &:hover {
        border: 4px solid #151134;
      }
      &[disabled] {
        border: 4px double #151134;
      }
      ${props.css || ''}
    `}
  />
)
