import { Frame, root, WeakMap } from './atom'

let get = <K extends WeakKey, V>(name: string): WeakMap<K, V> => {
  const { context } = root().state
  if (!context.has(name)) {
    context.set(name, new WeakMap())
  }
  return context.get(name)!
}

/** @internal DO NOT USE IN PRODUCT CODE */
export let initContext = () => get('init')

/** @internal DO NOT USE IN PRODUCT CODE */
export let getPrevPubs = (frame: Frame) => {
  let rec = get('pubs').create(frame.atom, () => ({
    prev: [null] as Frame['pubs'],
    next: frame.pubs,
  }))
  if (rec.next !== frame.pubs) {
    rec.prev = rec.next
    rec.next = frame.pubs
  }
  return rec.prev
}

/** @internal DO NOT USE IN PRODUCT CODE */
export let variableContext = () => get<Frame, WeakMap>('variable')
