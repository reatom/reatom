import type { Admin } from '../../index'
import { FilterEditor } from '../components/FilterEditor'
import { colors, flex, flexCol, scrollable } from '../styles'

export interface FiltersScreenProps {
  admin: Admin
}

export const FiltersScreen = ({ admin }: FiltersScreenProps) => {
  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        height: 100%;
        ${scrollable}
        padding: 1rem;
        color: ${colors.text};
      `}
    >
      <FilterEditor admin={admin} />
    </div>
  )
}
