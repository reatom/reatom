import { AtomCache, atom } from '@reatom/framework'
import { h, hf } from '../jsx'
import { idxMap } from '../utils'
import { ROOT } from '../jsx'

export const Stack = ({ patch }: { patch: AtomCache }) => {
  const stackEl = (
    <span
      aria-details={`${patch.proto.name} stack trace`}
      css={`
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-left: 50px;
      `}
    />
  )

  let cause = patch.cause
  while (cause && cause.proto.name !== 'root') {
    const causeId = idxMap.get(cause)
    const causeEl = causeId && ROOT.getElementById(causeId)

    stackEl.append(
      <span>
        {' ^ '}
        {causeEl ? (
          <a
            href={`#${causeId}`}
            on:click={(ctx, e) => {
              e.preventDefault()
              e.stopPropagation()
              causeEl.scrollIntoView()
              causeEl.focus()
            }}
            style:color={atom((ctx) =>
              // @ts-expect-error
              ctx.spy(causeEl.styleAtom).display === 'none'
                ? 'black'
                : undefined,
            )}
          >
            {cause.proto.name}
          </a>
        ) : (
          cause.proto.name!
        )}
      </span>,
    )

    cause = cause.cause
  }

  return stackEl
}
