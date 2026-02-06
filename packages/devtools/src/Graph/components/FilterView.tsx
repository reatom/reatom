import { Ctx, Fn, concurrent, sleep, atom } from '@reatom/framework'
import { h, hf, JSX } from '../../jsx'
import { Filter } from '../reatomFilters'
import { FilterButton } from './FilterButton'
import { Checkbox } from './Checkbox'
import * as icons from '../icons'

type FilterViewProps = {
  filter: Filter
  remove?: Fn<[Ctx]>
}

export const FilterView = ({ filter, remove }: FilterViewProps) => {
  return (
    <tr>
      <td
        css={`
          display: flex;
          justify-content: center;
          align-items: center;
        `}
      >
        <Checkbox
          aria-label="is filter active"
          model:checked={filter.active}
          css={`
            width: 30px;
            margin-right: 5px;
            padding: 0;
            border: none;
            display: flex;
            justify-content: center;
            align-items: center;
            outline: none;

            &[type='checkbox']:before {
              width: 16px;
              height: 16px;
            }
            &[type='checkbox']:after {
              width: 14px;
              height: 14px;
            }

            &[type='checkbox']:focus:before,
            &[type='checkbox']:hover:before {
              border-width: 2px;
            }
          `}
        />
        <FilterButton
          title="filter"
          aria-label="filter"
          disabled={atom((ctx) => ctx.spy(filter.type) === 'filter')}
          on:click={filter.type.setFilter}
          css:background={icons.matchIcon}
        />
        <FilterButton
          title="hide"
          aria-label="hide"
          disabled={atom((ctx) => ctx.spy(filter.type) === 'hide')}
          on:click={filter.type.setHide}
          css:background={icons.notMatchIcon}
        />
        <FilterButton
          title="exclude"
          aria-label="exclude"
          disabled={atom((ctx) => ctx.spy(filter.type) === 'exclude')}
          on:click={filter.type.setExclude}
          css:background={icons.excludeIcon}
        />
        <span
          data-highlight={atom((ctx) => ctx.spy(filter.type) === 'highlight')}
          css={`
            position: relative;
            width: 30px;
            height: 30px;
            margin-right: 5px;
            border: 2px solid #151134;
            border-radius: 2px;
            box-sizing: border-box;
            overflow: hidden;
            outline: none;
            &:has(input:focus),
            &:hover {
              border: 4px solid #151134;
            }
            &:before {
              position: absolute;
              content: '';
              width: 100%;
              height: 100%;
              background: ${icons.paintIconBucket};
              background-size: 80%;
              background-repeat: no-repeat;
              background-position: center;
              z-index: 1;
              pointer-events: none;
            }

            & input {
              opacity: 0;
            }

            &[data-highlight] {
              border: 4px double #151134;
              & input {
                opacity: 1;
              }
            }
          `}
        >
          <input
            title="highlight"
            aria-label="highlight"
            type="color"
            on:click={(ctx, e) => {
              if (ctx.get(filter.type) !== 'highlight') {
                filter.type.setHighlight(ctx)
                e.preventDefault()
              }
            }}
            model:value={filter.color}
            css={`
              padding: 0;
              border: none;
              position: absolute;
              width: 40px;
              height: 40px;
              top: -6px;
              left: -6px;
            `}
          />
        </span>
      </td>
      <td>
        <div
          css={`
            display: inline-flex;
            justify-content: center;
            align-items: center;
            flex-wrap: nowrap;
          `}
        >
          <input
            placeholder="RegExp"
            value={filter.search}
            on:input={concurrent(async (ctx, event) => {
              const { value } = event.currentTarget
              await ctx.schedule(() => sleep(150))
              filter.search(ctx, value)
            })}
            css={`
              border: 1px solid #151134;
              height: 30px;
              padding: 0 4px;
              box-sizing: border-box;
              background: none;
            `}
          />
          <input
            placeholder="State search"
            value={filter.stateSearch}
            on:input={concurrent(async (ctx, event) => {
              const { value } = event.currentTarget
              await ctx.schedule(() => sleep(150))
              filter.stateSearch(ctx, value)
            })}
            css={`
              border: 1px solid #151134;
              height: 30px;
              padding: 0 4px;
              margin-left: 5px;
              box-sizing: border-box;
              background: none;
            `}
          />
          {remove && (
            <FilterButton
              css={`
                margin-left: 10px;
                padding-bottom: 2px;
              `}
              title="Remove"
              aria-label="Remove filter"
              on:click={remove}
              css:background={icons.removeIcon}
            />
          )}
        </div>
      </td>
    </tr>
  )
}
