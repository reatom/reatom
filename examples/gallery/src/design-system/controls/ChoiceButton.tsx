import { Button, type ButtonProps, type ChoiceSelection } from './Button'

export type { ChoiceSelection }

export type ChoiceButtonProps = Omit<ButtonProps, 'appearance'> & {
  selected: NonNullable<ButtonProps['selected']>
  selection?: ChoiceSelection
}

export const ChoiceButton = ({
  size = 'sm',
  selection = 'pressed',
  ...props
}: ChoiceButtonProps) => (
  <Button appearance="choice" size={size} selection={selection} {...props} />
)
