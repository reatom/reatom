import type { Admin } from '../../index'
import { TimelineBars } from '../components/TimelineBars'
import { colors, flex, flexCol } from '../styles'

export interface TimelineScreenProps {
  admin: Admin
}

export const TimelineScreen = ({ admin }: TimelineScreenProps) => {
  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        height: 100%;
        padding: 1rem;
        color: ${colors.text};
      `}
    >
      <TimelineBars admin={admin} />
    </div>
  )
}
