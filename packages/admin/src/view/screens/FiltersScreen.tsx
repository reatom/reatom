import type { Admin } from '../../index'
import { FilterEditor } from '../components/FilterEditor'
import { colors, scrollable } from '../styles'

export interface FiltersScreenProps {
  admin: Admin
}

export const FiltersScreen = ({ admin }: FiltersScreenProps) => {
  return (
    <div
      css={`
        ${scrollable}
        display: grid;
        gap: 1rem;
        color: ${colors.text};
      `}
    >
      <FilterEditor admin={admin} />
    </div>
  )
}
