import type { Admin } from '../../index'
import { FilterBar } from '../components/FilterBar'
import { FrameDetail } from '../components/FrameDetail'
import { LogItem } from '../components/LogItem'
import {
  card,
  colors,
  flex,
  flexCol,
  gap,
  px,
  py,
  rounded,
  scrollable,
  shadowLg,
} from '../styles'

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
            padding: 0.75rem;
          `}
        >
          <div
            css={`
              ${flex}
              ${flexCol}
              ${gap(2)}
            `}
          >
            {() => {
              const visibleFrames = frames()
              if (visibleFrames.length === 0) {
                return (
                  <div
                    css={`
                      ${card}
                      ${rounded}
                      ${px(4)}
                      ${py(4)}
                      display: grid;
                      gap: 0.5rem;
                      place-items: start;
                      background: linear-gradient(
                        180deg,
                        ${colors.surface},
                        ${colors.surfaceElevated}
                      );
                    `}
                  >
                    <div
                      css={`
                        font-size: 0.85rem;
                        font-weight: 600;
                        color: ${colors.text};
                      `}
                    >
                      No frames to show
                    </div>
                    <div
                      css={`
                        font-size: 0.75rem;
                        color: ${colors.textMuted};
                        max-width: 30rem;
                        line-height: 1.5;
                      `}
                    >
                      Adjust the active filters, clear the search query, or
                      trigger a few atoms and actions to populate the log.
                    </div>
                  </div>
                )
              }

              return visibleFrames.map((frame) => (
                <LogItem
                  frame={frame}
                  atom={atoms().get(frame.atomId)}
                  isHighlighted={highlightedIds().has(frame.id)}
                  isSelected={selectedFrameId() === frame.id}
                  onSelect={() => {
                    admin.store.selectedFrameId.set(frame.id)
                    admin.causeGraph.selectedRootId.set(frame.id)
                  }}
                />
              ))
            }}
          </div>
        </div>
        {() => {
          const frame = selectedFrame()
          if (!frame) return null
          const atom = atoms().get(frame.atomId)
          const atomName = atom?.name ?? frame.atomId
          return (
            <div
              css={`
                width: 24rem;
                flex-shrink: 0;
                border-left: 1px solid ${colors.border};
                ${scrollable}
                padding: 0.75rem;
                background: linear-gradient(
                  180deg,
                  rgba(49, 50, 74, 0.48),
                  rgba(30, 30, 46, 0.72)
                );
              `}
            >
              <div
                css={`
                  ${shadowLg}
                `}
              >
                <FrameDetail
                  admin={admin}
                  frame={frame}
                  atomName={atomName}
                  onClose={() => admin.store.selectedFrameId.set(null)}
                />
              </div>
            </div>
          )
        }}
      </div>
    </div>
  )
}
