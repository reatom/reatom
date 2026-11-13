import { noop, urlAtom, withInit } from '@reatom/core'

// Unit contexts have no browser history. Keep real route matching/navigation,
// replacing only the external URL sink for every fresh Reatom context.
urlAtom.sync.extend(withInit(() => noop))
