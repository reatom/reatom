import {
  __root,
  AtomCache,
  AtomProto,
  CtxSpy,
  isShallowEqual,
} from '@reatom/framework'
import {
  getReatomGlobal,
  type ReatomGlobalPackage,
  ReatomError,
} from '@reatom/core'
import { css } from './jsx'

const REATOM_DEVTOOLS_VERSION = '1000.14.1'

export const getColor = ({ proto }: AtomCache): string =>
  proto.isAction
    ? proto.name!.endsWith('.onFulfill')
      ? '#B37400'
      : proto.name!.endsWith('.onReject')
        ? 'tomato'
        : '#999900'
    : '#151134'

export const getStartCause = (cause: AtomCache): AtomCache =>
  cause.cause?.cause == null ? cause : getStartCause(cause.cause)

export const memo =
  <T>(reducer: (ctx: CtxSpy) => T) =>
  (ctx: CtxSpy, state?: T): T => {
    const newState = reducer(ctx)
    return isShallowEqual(state, newState) ? (state as T) : newState
  }

class FollowingsMap extends Map<AtomCache, Array<AtomCache>> {
  add(patch: AtomCache) {
    while (patch.cause?.cause) {
      let followings = this.get(patch.cause)
      if (!followings) {
        this.set(patch.cause, (followings = []))
      }
      followings.push(patch)
      patch = patch.cause
    }
  }
}

export const HISTORY_LENGTH = 10

class HistoryStates extends WeakMap<AtomProto, Array<AtomCache>> {
  add(patch: AtomCache) {
    let list = this.get(patch.proto)
    if (!list) {
      list = []
      this.set(patch.proto, list)
    } else if (list.length >= HISTORY_LENGTH) {
      list.pop()
    } else if (list.length > 0 && Object.is(patch.state, list[0]!.state)) {
      return
    }

    list.unshift(patch)
  }
}

interface ReatomDevtoolsGlobalState {
  idxMap: WeakMap<AtomCache, string>
  idx: number
  followingsMap: FollowingsMap
  highlighted: Set<AtomCache>
  actionsStates: WeakMap<AtomCache, Array<any>>
  historyStates: HistoryStates
}

declare global {
  interface ReatomGlobalPackages {
    '@reatom/devtools/utils': ReatomGlobalPackage<ReatomDevtoolsGlobalState>
  }
}

let reatomGlobal = getReatomGlobal()
let reatomDevtoolsPackage = reatomGlobal.packages['@reatom/devtools/utils']
if (reatomDevtoolsPackage === undefined) {
  reatomDevtoolsPackage = reatomGlobal.packages['@reatom/devtools/utils'] = {
    version: REATOM_DEVTOOLS_VERSION,
    state: {
      idxMap: new WeakMap(),
      idx: 0,
      followingsMap: new FollowingsMap(),
      highlighted: new Set(),
      actionsStates: new WeakMap(),
      historyStates: new HistoryStates(),
    },
  }
} else if (reatomDevtoolsPackage.version !== REATOM_DEVTOOLS_VERSION) {
  throw new ReatomError('package duplication')
}
let reatomDevtoolsGlobal = reatomDevtoolsPackage.state

export const idxMap = reatomDevtoolsGlobal.idxMap
export const getId = (node: AtomCache) => {
  let id = idxMap.get(node)
  if (!id) {
    idxMap.set(node, (id = `${node.proto.name}-${++reatomDevtoolsGlobal.idx}`))
  }
  return id
}

export const followingsMap = reatomDevtoolsGlobal.followingsMap

export const highlighted = reatomDevtoolsGlobal.highlighted

export const actionsStates = reatomDevtoolsGlobal.actionsStates

export const historyStates = reatomDevtoolsGlobal.historyStates

export const buttonCss = css`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 2px 4px;
  font-size: 12px;
  background: none;
  box-sizing: border-box;
  border: 2px solid #151134;
  border-radius: 2px;
  outline: none;
  &:focus,
  &:not([disabled]):hover {
    border: 4px solid #151134;
  }
`
