import { Atom, atom, AtomMut } from '@reatom/framework'
import { h, hf } from '../jsx'

type TimeStampProps = {
  nodesToWatch: AtomMut<Atom[]>
}

export const TimeStamp = ({ nodesToWatch }: TimeStampProps) => {
  let ms: number | string = new Date().getMilliseconds()
  ms = ms.toString().padStart(3, '0')

  const display = atom((ctx) =>
    ctx
      .spy(nodesToWatch)
      .every((styleAtom) => ctx.spy(styleAtom).display === 'none')
      ? 'none'
      : 'flex',
  )

  return (
    <li
      ref={(ctx, el) => {
        // Use a function to update the atom's state
        const newState: Atom[] = []
        let next = el.nextElementSibling
        while (next?.id && 'styleAtom' in next) {
          newState.push(next.styleAtom as Atom)
          next = next.nextElementSibling
        }
        nodesToWatch(ctx, newState)
      }}
      style:display={display}
      css={`
        display: flex;
        justify-content: center;
        align-items: center;
        color: gray;
      `}
    >{`${new Date().toLocaleTimeString()} ${ms}ms`}</li>
  )
}
