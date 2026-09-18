import { atom } from '@reatom/core'

import { Draggable } from './DragTarget'
import type { ListElement } from './model'
import { add, count, list, moveDown, moveUp } from './model'

const Add = () => (
  <form
    on:submit={(e) => {
      e.preventDefault()
      add()
    }}
  >
    <label for="itemsToAdd">Items to add: </label>
    <input
      id="itemsToAdd"
      model:valueAsNumber={count}
      type="number"
      min={1}
      autofocus
    />
    <button>submit</button>
  </form>
)

const Item = ({ input }: { input: ListElement }) => {
  const name = input.name!
  const hue = atom(() => (input().length * 30) % 360, `${name}.hue`)

  return (
    <Draggable
      as="li"
      list={list}
      item={input}
      followX={false}
      css={`
        margin: 1em;
        &::marker {
          content: '';
        }
      `}
    >
      <input
        model:value={input}
        autofocus={false}
        css:hue={hue}
        css={`
          color: hsl(var(--hue), 50%, 50%);
        `}
      />
      <button on:click={() => moveUp(input)}>👆</button>
      <button on:click={() => moveDown(input)}>👇</button>
      <button on:click={() => list.remove(input)}>🗑️</button>
    </Draggable>
  )
}

export const App = () => (
  <main>
    <Add />
    <br />
    <button on:click={list.clear}>clear</button>
    <br />
    <ul
      css={`
        width: fit-content;
      `}
    >
      {list.reatomMap(
        (input) => (
          <Item input={input} />
        ),
        '_listView',
      )}
    </ul>
  </main>
)
