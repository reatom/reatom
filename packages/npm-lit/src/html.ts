import {
  html as coreHtml,
  svg as coreSvg,
  type TemplateResult,
} from 'lit/html.js'

import { watch } from './watch.js'
import { isAtom } from '@reatom/core'

export const withWatch =
  (coreTag: typeof coreHtml | typeof coreSvg) =>
  (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult => {
    return coreTag(
      strings,
      ...values.map((v) => {
        return isAtom(v) ? watch(v) : v
      }),
    )
  }

export const html = withWatch(coreHtml)
export const svg = withWatch(coreSvg)
