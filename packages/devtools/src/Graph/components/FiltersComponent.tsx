import { AtomMut, atom, action, select } from '@reatom/framework'
import { h, hf, JSX } from '../../jsx'
import { Filters } from '../reatomFilters'
import { FilterView } from './FilterView'
import { ActionButton } from './ActionButton'
import { ActionLabel } from './ActionLabel'
import { Lines } from '../reatomLines'
import { GraphList } from '../reatomGraph'

type FiltersComponentProps = {
  name: string
  filters: Filters
  lines: Lines
  list: GraphList
  recording: AtomMut<boolean>
  HIGHLIGHT_COLOR: string
}

export const FiltersComponent = ({
  name,
  filters,
  lines,
  list,
  recording,
  HIGHLIGHT_COLOR,
}: FiltersComponentProps) => {
  return (
    <div
      css={`
        flex-shrink: 0;
        max-height: 40%;
        overflow: auto;
        & input::placeholder {
          color: currentColor;
          opacity: 0.8;
        }
      `}
    >
      <fieldset
        on:click={(ctx, e) => {
          if (e.target === e.currentTarget && ctx.get(filters.folded)) {
            filters.folded(ctx, false)
          }
        }}
        data-folded={filters.folded}
        css={`
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 0 20px;

          &[data-folded] {
            max-height: 0px;
            overflow: hidden;
            padding-bottom: 0;
          }
        `}
      >
        <legend
          css={`
            cursor: pointer;
          `}
          aria-label="Show/hide filters"
          title="Show/hide filters"
          tabindex={0}
          role="button"
          aria-expanded={filters.folded}
          on:click={filters.folded.toggle}
        >
          controls
        </legend>
        <form
          on:submit={(ctx, e) => {
            e.preventDefault()
            const active = ctx.get(filters.search.active)
            const search = ctx.get(filters.search.search)
            const stateSearch = ctx.get(filters.search.stateSearch)
            const type = ctx.get(filters.search.type)
            const color = ctx.get(filters.search.color)
            filters.list.create(ctx, {
              active,
              search,
              stateSearch,
              type,
              color,
            })
            filters.search.active(ctx, true)
            filters.search.search(ctx, '')
            filters.search.stateSearch(ctx, '')
            filters.search.type.setFilter(ctx)
            filters.search.color(ctx, HIGHLIGHT_COLOR)
          }}
          css={`
            display: inline-flex;
            align-items: center;
          `}
        >
          <table
            css={`
              width: fit-content;
            `}
          >
            <FilterView filter={filters.search} />
          </table>
          <button
            css={`
              width: 70px;
              height: 30px;
              padding-bottom: 2px;
              background: none;
              border: 2px solid #151134;
              margin-left: 5px;
            `}
          >
            save
          </button>
        </form>
        {atom(
          (ctx) =>
            select(ctx, (ctx) => ctx.spy(filters.list).size > 0) && (
              <>
                <hr
                  css={`
                    width: 100%;
                    border-top: 1px solid gray;
                    border-bottom: none;
                  `}
                />
                <table
                  css={`
                    width: fit-content;
                  `}
                >
                  {filters.list.reatomMap((ctx, filter) => (
                    <FilterView
                      filter={filter}
                      remove={(ctx) => filters.list.remove(ctx, filter)}
                    />
                  ))}
                </table>
              </>
            ),
        )}
        <hr
          css={`
            width: 100%;
            border-top: 1px solid gray;
            border-bottom: none;
          `}
        />
        <div
          css={`
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          `}
        >
          <ActionButton on:click={list.clear}>clear logs</ActionButton>
          <ActionButton
            disabled={atom(
              (ctx) => ctx.spy(lines).size === 0,
              `${name}.clear.disabled`,
            )}
            on:click={lines.clear}
          >
            clear lines
          </ActionButton>
          <ActionLabel model={recording}>recording</ActionLabel>
          <ActionLabel model={filters.preview}>preview</ActionLabel>
          <ActionLabel model={filters.time}>time</ActionLabel>
          <ActionButton on:click={list.snap}>snap</ActionButton>
          <label
            css={`
              flex-shrink: 0;
              display: flex;
              align-items: center;
            `}
          >
            {atom(
              (ctx) => `logged ${ctx.spy(list).size} of `,
              `${name}.logged`,
            )}
            <input
              model:valueAsNumber={filters.size}
              style:width={atom(
                (ctx) =>
                  `${Math.max(3, ctx.spy(filters.size).toString().length)}em`,
                `${name}.logged.size`,
              )}
              css={`
                background: none;
                border: none;
                margin-left: 5px;
                font-size: inherit;
                &:focus {
                  outline: 2px solid #151134;
                }
              `}
            />
          </label>
        </div>
      </fieldset>
    </div>
  )
}
