import type { Admin } from '../../index'
import { FilterBar } from '../components/FilterBar'
import { FrameDetail } from '../components/FrameDetail'
import { LogItem } from '../components/LogItem'
import { colors, flex, flexCol, scrollable } from '../styles'

export interface LogScreenProps {
  admin: Admin
}

export const LogScreen = ({ admin }: LogScreenProps) => {
  const frames = () => {
    const query = admin.filters.search.searchQuery()
    if (query) {
      return admin.filters.search.searchResults()
    }
    return admin.filters.engine.visibleFrames()
  }
  const highlightedIds = () => admin.filters.engine.highlightedIds()
  const atoms = () => admin.store.getAtoms()
  const selectedFrameId = () => admin.store.selectedFrameId()
  const selectedFrame = () => admin.store.selectedFrame()

  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        height: 100%;
      `}
    >
      <FilterBar admin={admin} />
      <div
        css={`
          flex: 1;
          display: flex;
          flex-direction: row;
          min-height: 0;
        `}
      >
        <div
          css={`
            flex: 1;
            ${scrollable}
            min-width: 0;
          `}
        >
          {() =>
            frames().map((frame) => (
              <LogItem
                frame={frame}
                atomName={atoms().get(frame.atomId)?.name ?? frame.atomId}
                isHighlighted={highlightedIds().has(frame.id)}
                isSelected={selectedFrameId() === frame.id}
                onSelect={() => {
                  admin.store.selectedFrameId.set(frame.id)
                  admin.causeGraph.selectedRootId.set(frame.id)
                }}
              />
            ))
          }
        </div>
        {() => {
          const frame = selectedFrame()
          if (!frame) return null
          const atomName = atoms().get(frame.atomId)?.name ?? frame.atomId
          return (
            <div
              css={`
                width: 20rem;
                flex-shrink: 0;
                border-left: 1px solid ${colors.border};
                ${scrollable}
                padding: 0.5rem;
              `}
            >
              <FrameDetail
                admin={admin}
                frame={frame}
                atomName={atomName}
                onClose={() => admin.store.selectedFrameId.set(null)}
              />
            </div>
          )
        }}
      </div>
    </div>
  )
}
