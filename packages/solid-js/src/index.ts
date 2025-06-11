import { type Frame, ReatomError, STACK } from '@reatom/core'
import {
  type Accessor,
  createContext,
  from,
  getOwner,
  useContext,
} from 'solid-js'

export const reatomContext = createContext<null | Frame>(null)

export let useFrame = (): Frame => {
  let frame = useContext(reatomContext) ?? STACK[0]

  if (!frame) {
    throw new ReatomError(
      'the root is not set, you probably forgot to specify the  provider',
    )
  }

  return frame
}

// @ts-ignore
export const useAtom: {
  <T extends Atom>(
    atom: T,
  ): [
    get: Accessor<AtomState<T>>,
    updater: T extends Fn<[Ctx, ...infer Args], infer Res>
      ? Fn<Args, Res>
      : undefined,
    atom: T,
  ]
  <T>(
    computed: (ctx: CtxSpy) => T,
    name?: string,
  ): [get: Accessor<T>, updater: undefined, atom: Atom<T>]
  <T>(
    init: T,
    name?: string,
  ): [get: Accessor<T>, updater: Fn<[T | Fn<[T, Ctx], T>], T>, atom: AtomMut<T>]
} = (init, name): [any, any, Atom] => {
  const theAtom: Atom = isAtom(init)
    ? init
    : atom(
        init,
        name ??
          __count(
            `${
              getOwner()?.owner?.name?.replace('[solid-refresh]', '') ?? 'use'
            }Atom`,
          ),
      )
  const ctx = useCtx()

  return [
    from((set) => ctx.subscribe(theAtom, set)),
    typeof theAtom === 'function' ? bind(ctx, theAtom) : undefined,
    theAtom,
  ]
}
