import { _createGlobal, atom, peek, ReatomError } from '@reatom/core'

import { stylesheet } from './global'
import type { AtomOrGetterMaybe } from './jsx'

let cssVarDefinitions = _createGlobal(
  'jsx.cssVars',
  () => new Map<string, string>(),
)

let CSS_IDENT = /^[a-zA-Z_][\w-]*$/
let RESERVED_IDENTS = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
  'default',
])

/**
 * Names, query fragments, and provider props for one inherited custom property.
 * Each method is named after the CSS it emits.
 */
export interface CssVar<Name extends string, Value extends string> {
  /** `--reatom-${Name}` */
  property: `--reatom-${Name}`
  /** `style(--reatom-<name>: <value>)` */
  style: (value: Value) => string
  /**
   * One value: `@container style(--reatom-<name>: <v>)`. Several: `@container
   * (style(--reatom-<name>: a) or style(--reatom-<name>: b))`.
   */
  container: (...matches: [Value, ...Value[]]) => string
  /** `var(--reatom-<name>)` */
  var: () => string
  /**
   * Registers the property and returns the `css:reatom-<name>` prop. `source`
   * is whatever a `css:` prop accepts: a static value, an atom, or a getter.
   */
  provide: <Source extends AtomOrGetterMaybe<Value | null | undefined>>(
    source: Source,
  ) => { [K in `css:reatom-${Name}`]: Source }
}

let assertCssIdent = (token: string, ident: string) => {
  if (!CSS_IDENT.test(ident) || RESERVED_IDENTS.has(ident.toLowerCase())) {
    throw new ReatomError(
      `cssVar "${token}": "${ident}" is not a valid CSS identifier`,
    )
  }
}

/**
 * Inherited theme-like state for descendants. The ancestor spreads
 * `provide(source)`; descendants query it with `container()` / `style()` inside
 * `css`. The property is `--reatom-<name>`, declared with `@property` on the
 * first `provide()`, so an unknown value computes to the first value in
 * `values`.
 *
 * @example
 *   const pack = cssVar('theme-pack', ['minimal', 'polaroid'])
 *   const props = {
 *     ...pack.provide(themePack),
 *     css: `
 *       display: none;
 *       ${pack.container('polaroid')} { display: inline; }
 *     `,
 *   }
 */
export let cssVar = <Name extends string, const Value extends string>(
  name: Name,
  values: readonly [Value, ...Value[]],
): CssVar<Name, Value> => {
  let property: `--reatom-${Name}` = `--reatom-${name}`
  let syntax = values.join(' | ')

  for (let ident of [name, ...values]) assertCssIdent(name, ident)

  let knownSyntax = cssVarDefinitions.get(property)
  if (knownSyntax !== undefined && knownSyntax !== syntax) {
    throw new ReatomError(
      `cssVar "${name}" is already defined as "${knownSyntax}", got "${syntax}". Rename it, or reload the page after changing its values.`,
    )
  }
  cssVarDefinitions.set(property, syntax)

  let declaredSheet = atom<CSSStyleSheet | null>(
    null,
    `jsx.cssVar.${name}._declaredSheet`,
  )
  let style = (value: Value) => `style(${property}: ${value})`

  return {
    property,
    style,
    container: (...matches) => {
      let [first, ...rest] = matches
      if (!rest.length) return `@container ${style(first)}`
      return `@container (${matches.map((match) => style(match)).join(' or ')})`
    },
    var: () => `var(${property})`,
    provide: (source) => {
      let sheet = stylesheet()
      if (peek(declaredSheet) !== sheet) {
        declaredSheet.set(sheet)
        sheet.insertRule(
          `@property ${property}{syntax:'${syntax}';inherits:true;initial-value:${values[0]}}`,
        )
      }
      return { [`css:reatom-${name}`]: source } as {
        [K in `css:reatom-${Name}`]: typeof source
      }
    },
  }
}
