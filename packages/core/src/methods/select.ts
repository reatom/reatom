import {
  computed,
  type Frame,
  type FunctionSource,
  named,
  ReatomError,
  top,
} from '../core'

const touchedMap = new WeakMap<Frame, Record<FunctionSource, true>>()

export let select = <T>(
  cb: () => T,
  equal: (oldState: T, newState: T) => boolean = () => false,
): T => {
  let frame = top()
  let touched = touchedMap.get(frame)
  if (!touched) {
    touchedMap.set(frame, (touched = {}))
  }

  const map = frame.root.selects
  let atoms = map.get(frame.atom)

  if (!atoms) {
    map.set(frame.atom, (atoms = {}))
  }

  const selectSource = cb.toString()

  if (selectSource in touched) {
    throw new ReatomError(
      'multiple select with the same "toString" representation is not possible',
    )
  }

  touched[selectSource] = true

  let selectAtom = atoms[selectSource]
  if (!selectAtom) {
    let isInit = true
    atoms[selectSource] = selectAtom = computed(
      (prevState?: any) => {
        const newState = cb()
        const resultState =
          isInit || !equal(prevState, newState) ? newState : prevState
        isInit = false
        return resultState
      },
      named(`${frame.atom.name}._select`),
    )
  }

  return selectAtom()
}
