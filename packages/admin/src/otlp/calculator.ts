import type {
  CausePredicate,
  FilterGroup,
  FilterPredicate,
  FilterTag,
  FilterTagRef,
} from '../types'
import {
  frameRecordKey,
  framedByFrameId,
  recordHasError,
  recordLabel,
  toRailNode,
} from './bind.ts'
import type { AdminRecord } from './ingest.ts'
import { recordValuesText } from './values.ts'

export type CalculatorCompareOp = ':' | '=' | '>' | '<' | '>=' | '<='

export interface CalculatorCompareValue {
  field: string
  op: CalculatorCompareOp
  raw: string
}

export interface CalculatorAttrValue {
  path: string
  op: CalculatorCompareOp
  raw: string
}

export interface CalculatorParseOk {
  ok: true
  source: string
  expression: FilterGroup
  tags: FilterTag[]
}

export interface CalculatorParseErr {
  ok: false
  source: string
  error: string
}

export type CalculatorParse = CalculatorParseOk | CalculatorParseErr

export interface CalculatorRecordIndex {
  records: readonly AdminRecord[]
  byFrame: Map<string, AdminRecord>
  children: Map<string, string[]>
  spanCountByTrace: Map<string, number>
}

export type CalculatorHighlightKind =
  'space' | 'keyword' | 'field' | 'op' | 'value' | 'string' | 'paren' | 'error'

export interface CalculatorHighlightSpan {
  kind: CalculatorHighlightKind
  text: string
}

const KNOWN_FIELDS = new Set([
  'name',
  'params',
  'payload',
  'state',
  'event',
  'kind',
  'outcome',
  'duration',
  'errors',
  'trace',
  'session',
  'route',
  'source',
  'spans',
])

const EMPTY_GROUP: FilterGroup = { operator: 'AND', children: [] }

type Token =
  | { kind: 'and' }
  | { kind: 'or' }
  | { kind: 'not' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'op'; value: CalculatorCompareOp }
  | { kind: 'word'; value: string }
  | { kind: 'string'; value: string }

class ParseFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseFailure'
  }
}

function isTagRef(child: FilterTagRef | FilterGroup): child is FilterTagRef {
  return 'tagId' in child
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  while (index < source.length) {
    const character = source[index]!
    if (/\s/.test(character)) {
      index += 1
      continue
    }
    if (character === '(') {
      tokens.push({ kind: 'lparen' })
      index += 1
      continue
    }
    if (character === ')') {
      tokens.push({ kind: 'rparen' })
      index += 1
      continue
    }
    if (character === '"' || character === "'") {
      const quote = character
      index += 1
      let value = ''
      while (index < source.length) {
        const next = source[index]!
        if (next === '\\' && index + 1 < source.length) {
          value += source[index + 1]!
          index += 2
          continue
        }
        if (next === quote) {
          index += 1
          break
        }
        value += next
        index += 1
      }
      tokens.push({ kind: 'string', value })
      continue
    }
    const pair = source.slice(index, index + 2)
    if (pair === '>=' || pair === '<=') {
      tokens.push({ kind: 'op', value: pair })
      index += 2
      continue
    }
    if (
      character === '>' ||
      character === '<' ||
      character === '=' ||
      character === ':'
    ) {
      tokens.push({ kind: 'op', value: character })
      index += 1
      continue
    }
    let end = index
    while (end < source.length && !/[\s()><=:"]/.test(source[end]!)) end += 1
    const word = source.slice(index, end)
    if (word === '') {
      throw new ParseFailure(`Unexpected '${character}'`)
    }
    const upper = word.toUpperCase()
    if (upper === 'AND') tokens.push({ kind: 'and' })
    else if (upper === 'OR') tokens.push({ kind: 'or' })
    else if (upper === 'NOT') tokens.push({ kind: 'not' })
    else tokens.push({ kind: 'word', value: word })
    index = end
  }
  return tokens
}

const HIGHLIGHT_KEYWORDS = new Set(['AND', 'OR', 'NOT'])

function isHighlightField(word: string): boolean {
  return (
    word === 'cause' ||
    word === 'spans' ||
    word.startsWith('attr.') ||
    KNOWN_FIELDS.has(word)
  )
}

function readHighlightString(source: string, start: number): number {
  const quote = source[start]!
  let index = start + 1
  while (index < source.length) {
    const next = source[index]!
    if (next === '\\' && index + 1 < source.length) {
      index += 2
      continue
    }
    if (next === quote) return index + 1
    index += 1
  }
  return index
}

/**
 * Split a calculator source into highlight spans that cover the original
 * string. Does not throw — incomplete or invalid queries still color.
 */
export function highlightCalculator(source: string): CalculatorHighlightSpan[] {
  const spans: CalculatorHighlightSpan[] = []
  let index = 0
  let expectValue = false
  while (index < source.length) {
    const character = source[index]!
    if (/\s/.test(character)) {
      let end = index + 1
      while (end < source.length && /\s/.test(source[end]!)) end += 1
      spans.push({ kind: 'space', text: source.slice(index, end) })
      index = end
      continue
    }
    if (character === '(' || character === ')') {
      spans.push({ kind: 'paren', text: character })
      expectValue = false
      index += 1
      continue
    }
    if (character === '"' || character === "'") {
      const end = readHighlightString(source, index)
      spans.push({ kind: 'string', text: source.slice(index, end) })
      expectValue = false
      index = end
      continue
    }
    const pair = source.slice(index, index + 2)
    if (pair === '>=' || pair === '<=') {
      spans.push({ kind: 'op', text: pair })
      expectValue = true
      index += 2
      continue
    }
    if (
      character === '>' ||
      character === '<' ||
      character === '=' ||
      character === ':'
    ) {
      spans.push({ kind: 'op', text: character })
      expectValue = true
      index += 1
      continue
    }
    let end = index
    while (end < source.length && !/[\s()><=:"]/.test(source[end]!)) end += 1
    const word = source.slice(index, end)
    if (word === '') {
      spans.push({ kind: 'error', text: character })
      index += 1
      continue
    }
    const upper = word.toUpperCase()
    let kind: CalculatorHighlightKind
    if (HIGHLIGHT_KEYWORDS.has(upper)) kind = 'keyword'
    else if (expectValue) kind = 'value'
    else if (isHighlightField(word)) kind = 'field'
    else kind = 'error'
    spans.push({ kind, text: word })
    expectValue = false
    index = end
  }
  return spans
}

function isFalsey(raw: string): boolean {
  const folded = raw.trim().toLowerCase()
  return folded === 'false' || folded === 'no' || folded === '0'
}

function parseDurationMs(raw: string): number | undefined {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/i)
  if (!match) return undefined
  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return undefined
  const unit = (match[2] ?? 'ms').toLowerCase()
  if (unit === 's') return amount * 1000
  if (unit === 'm') return amount * 60_000
  return amount
}

function parseNumber(raw: string): number | undefined {
  const duration = parseDurationMs(raw)
  if (duration !== undefined) return duration
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : undefined
}

/** Write a value so the calculator reads it back as one value token. */
export function quoteCalculatorValue(raw: string): string {
  if (/^[A-Za-z0-9_.*+-]+$/.test(raw) && !/^(AND|OR|NOT)$/i.test(raw)) {
    return raw
  }
  return `"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function clausePredicate(
  field: string,
  op: CalculatorCompareOp,
  raw: string,
  id: string,
): FilterPredicate {
  if (field.startsWith('attr.')) {
    return {
      id,
      type: 'attr',
      value: {
        path: field.slice('attr.'.length),
        op,
        raw,
      } satisfies CalculatorAttrValue,
    }
  }
  return {
    id,
    type: 'compare',
    value: { field, op, raw } satisfies CalculatorCompareValue,
  }
}

function negateNode(
  node: FilterTagRef | FilterGroup,
): FilterTagRef | FilterGroup {
  if (isTagRef(node)) {
    return { tagId: node.tagId, negated: !node.negated }
  }
  const flipped: FilterGroup = {
    operator: node.operator === 'AND' ? 'OR' : 'AND',
    children: node.children.map(negateNode),
  }
  return flipped
}

function asGroup(node: FilterTagRef | FilterGroup): FilterGroup {
  if (!isTagRef(node)) return node
  return { operator: 'AND', children: [node] }
}

function flattenSame(
  operator: FilterGroup['operator'],
  nodes: Array<FilterTagRef | FilterGroup>,
): FilterGroup {
  const children: Array<FilterTagRef | FilterGroup> = []
  for (const node of nodes) {
    if (!isTagRef(node) && node.operator === operator) {
      children.push(...node.children)
    } else {
      children.push(node)
    }
  }
  return { operator, children }
}

interface ParserState {
  tokens: Token[]
  index: number
  tags: FilterTag[]
}

function peek(state: ParserState): Token | undefined {
  return state.tokens[state.index]
}

function take(state: ParserState): Token {
  const token = state.tokens[state.index]
  if (!token) throw new ParseFailure('Unexpected end of calculator')
  state.index += 1
  return token
}

function readValue(state: ParserState): string {
  const token = take(state)
  if (token.kind === 'word' || token.kind === 'string') return token.value
  throw new ParseFailure('Expected a value after the operator')
}

function parseClause(state: ParserState): FilterTagRef {
  const token = take(state)
  if (token.kind !== 'word') throw new ParseFailure('Expected a filter target')
  const field = token.value
  if (field === 'cause') {
    const causeOp = take(state)
    if (
      causeOp.kind !== 'op' ||
      (causeOp.value !== '>' && causeOp.value !== '<')
    ) {
      throw new ParseFailure('cause needs > or <')
    }
    const raw = readValue(state)
    const tagIndex = state.tags.length
    const predicate: CausePredicate = {
      id: `calc.${tagIndex}.p`,
      type: 'cause',
      direction: causeOp.value,
      referencePattern: raw,
      value: undefined,
    }
    const tag: FilterTag = {
      id: `calc.${tagIndex}`,
      name: `cause${causeOp.value}${raw}`,
      predicates: [predicate],
      builtIn: false,
    }
    state.tags.push(tag)
    return { tagId: tag.id, negated: false }
  }
  if (!field.startsWith('attr.') && !KNOWN_FIELDS.has(field)) {
    throw new ParseFailure(`Unknown target '${field}'`)
  }
  const opToken = take(state)
  if (opToken.kind !== 'op') {
    throw new ParseFailure(`Expected :, =, >, <, >=, or <= after '${field}'`)
  }
  const raw = readValue(state)
  const tagIndex = state.tags.length
  const predicate = clausePredicate(
    field,
    opToken.value,
    raw,
    `calc.${tagIndex}.p`,
  )
  const tag: FilterTag = {
    id: `calc.${tagIndex}`,
    name: `${field}${opToken.value}${raw}`,
    predicates: [predicate],
    builtIn: false,
  }
  state.tags.push(tag)
  return { tagId: tag.id, negated: false }
}

function parsePrimary(state: ParserState): FilterTagRef | FilterGroup {
  const token = peek(state)
  if (!token) throw new ParseFailure('Unexpected end of calculator')
  if (token.kind === 'lparen') {
    take(state)
    const inner = parseOr(state)
    const close = take(state)
    if (close.kind !== 'rparen') throw new ParseFailure('Expected )')
    return inner
  }
  return parseClause(state)
}

function parseUnary(state: ParserState): FilterTagRef | FilterGroup {
  const token = peek(state)
  if (token?.kind === 'not') {
    take(state)
    return negateNode(parseUnary(state))
  }
  return parsePrimary(state)
}

function startsClause(token: Token | undefined): boolean {
  return (
    token?.kind === 'word' || token?.kind === 'lparen' || token?.kind === 'not'
  )
}

function parseAnd(state: ParserState): FilterTagRef | FilterGroup {
  const nodes = [parseUnary(state)]
  while (peek(state)?.kind === 'and' || startsClause(peek(state))) {
    if (peek(state)?.kind === 'and') take(state)
    nodes.push(parseUnary(state))
  }
  if (nodes.length === 1) return nodes[0]!
  return flattenSame('AND', nodes)
}

function parseOr(state: ParserState): FilterTagRef | FilterGroup {
  const nodes = [parseAnd(state)]
  while (peek(state)?.kind === 'or') {
    take(state)
    nodes.push(parseAnd(state))
  }
  if (nodes.length === 1) return nodes[0]!
  return flattenSame('OR', nodes)
}

/**
 * Parse the admin calculator language into today's `FilterGroup` tree plus
 * generated tags. Round-trip with `stringifyCalculator`.
 *
 * Clauses separated only by whitespace are joined with AND, so `name:makeMove
 * kind:action` equals `name:makeMove AND kind:action`.
 *
 * Operators: `=` is case-insensitive whole-value equality. `:` on text fields
 * (`name`, `state`, `params`, `payload`, `event`, `outcome`, `session`,
 * `source`, `route`) is case-insensitive substring match; `*` in the value is a
 * whole-value glob. On `kind`, `errors`, `duration`, `spans`, `trace`, and
 * numeric `attr.*`, `:` and `=` are the same equality. `spans` is the per-trace
 * span count. `cause>` walks ancestors via `reatom.cause.ids` (same join as the
 * cause graph). `cause<` matches direct children. Calculator tags use `compare`
 * / `attr` / `cause` predicates and are not evaluated by the Reporter
 * `evaluatePredicate`.
 */
export function parseCalculator(source: string): CalculatorParse {
  const trimmed = source.trim()
  if (trimmed === '') {
    return { ok: true, source: '', expression: EMPTY_GROUP, tags: [] }
  }
  try {
    const state: ParserState = {
      tokens: tokenize(trimmed),
      index: 0,
      tags: [],
    }
    if (state.tokens.length === 0) {
      return { ok: true, source: '', expression: EMPTY_GROUP, tags: [] }
    }
    const root = asGroup(parseOr(state))
    if (state.index !== state.tokens.length) {
      throw new ParseFailure('Unexpected extra tokens')
    }
    return { ok: true, source: trimmed, expression: root, tags: state.tags }
  } catch (error) {
    const message =
      error instanceof ParseFailure ? error.message : 'Invalid calculator'
    return { ok: false, source, error: message }
  }
}

function stringifyNode(
  node: FilterTagRef | FilterGroup,
  tags: Map<string, FilterTag>,
  parent: FilterGroup['operator'] | null,
): string {
  if (isTagRef(node)) {
    const tag = tags.get(node.tagId)
    if (!tag) return ''
    const body = stringifyTag(tag)
    return node.negated ? `NOT ${body}` : body
  }
  const joiner = node.operator === 'AND' ? ' AND ' : ' OR '
  const parts = node.children.map((child) =>
    stringifyNode(child, tags, node.operator),
  )
  const joined = parts.join(joiner)
  const wrap =
    (parent === 'AND' && node.operator === 'OR') ||
    (parent === 'OR' && node.operator === 'AND')
  return wrap ? `(${joined})` : joined
}

function stringifyTag(tag: FilterTag): string {
  const predicate = tag.predicates[0]
  if (!predicate) return tag.name
  if (predicate.type === 'cause') {
    const cause = predicate as CausePredicate
    return `cause${cause.direction}${quoteCalculatorValue(cause.referencePattern)}`
  }
  if (predicate.type === 'attr') {
    const value = predicate.value as CalculatorAttrValue
    return `attr.${value.path}${value.op}${quoteCalculatorValue(value.raw)}`
  }
  if (predicate.type === 'compare') {
    const value = predicate.value as CalculatorCompareValue
    return `${value.field}${value.op}${quoteCalculatorValue(value.raw)}`
  }
  return tag.name
}

/** Calculator source for one node of a parsed expression. */
export function stringifyCalculatorNode(
  node: FilterTagRef | FilterGroup,
  tags: readonly FilterTag[],
): string {
  return stringifyNode(node, new Map(tags.map((tag) => [tag.id, tag])), null)
}

export function stringifyCalculator(parsed: CalculatorParseOk): string {
  if (parsed.expression.children.length === 0) return ''
  return stringifyNode(
    parsed.expression,
    new Map(parsed.tags.map((tag) => [tag.id, tag])),
    null,
  )
}

function globRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`, 'i')
}

function serializeUnknown(value: unknown): string {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function nameCandidates(record: AdminRecord): string[] {
  const names = [record.name]
  if (record.atomName !== undefined) names.push(record.atomName)
  const label = recordLabel(record)
  if (!names.includes(label)) names.push(label)
  return names
}

function matchTextValue(
  haystack: string,
  needle: string,
  op: CalculatorCompareOp,
): boolean {
  if (needle.includes('*')) return globRegex(needle).test(haystack)
  if (op === '=') return haystack.toLowerCase() === needle.toLowerCase()
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function matchLocalValuesText(
  record: AdminRecord,
  raw: string,
  op: CalculatorCompareOp,
): boolean {
  const text = recordValuesText(record)
  if (text === '') return false
  return matchTextValue(text, raw, op)
}

function matchNameField(
  record: AdminRecord,
  raw: string,
  op: CalculatorCompareOp,
): boolean {
  return nameCandidates(record).some((name) => matchTextValue(name, raw, op))
}

function matchNumeric(
  actual: number,
  op: CalculatorCompareOp,
  raw: string,
): boolean {
  const expected = parseNumber(raw)
  if (expected === undefined) return false
  switch (op) {
    case '>':
      return actual > expected
    case '<':
      return actual < expected
    case '>=':
      return actual >= expected
    case '<=':
      return actual <= expected
    case ':':
    case '=':
      return actual === expected
  }
}

function attrValue(record: AdminRecord, path: string): unknown {
  if (path in record.attributes) return record.attributes[path]
  const parts = path.split('.')
  let current: unknown = record.attributes
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function recordDurationMs(record: AdminRecord): number | undefined {
  if (record.end === undefined) return undefined
  return Math.max(0, record.end - record.start)
}

function matchKindField(record: AdminRecord, raw: string): boolean {
  const expected = raw.trim().toLowerCase()
  if (record.reatomKind?.toLowerCase() === expected) return true
  return record.kind.toLowerCase() === expected
}

function matchRouteField(
  record: AdminRecord,
  raw: string,
  op: CalculatorCompareOp,
): boolean {
  if (record.reatomKind !== 'route') return false
  const trimmed = raw.trim()
  if (trimmed === '*' || /^(true|yes|1)$/i.test(trimmed)) return true
  return (
    nameCandidates(record).some((name) => matchTextValue(name, raw, op)) ||
    matchTextValue(record.name, `route ${raw}`, op)
  )
}

function matchCompare(
  record: AdminRecord,
  field: string,
  op: CalculatorCompareOp,
  raw: string,
  index: CalculatorRecordIndex | undefined,
): boolean {
  switch (field) {
    case 'name':
      return matchNameField(record, raw, op)
    case 'params':
      return (
        matchTextValue(
          serializeUnknown(record.attributes['reatom.params']),
          raw,
          op,
        ) || matchLocalValuesText(record, raw, op)
      )
    case 'payload':
      return (
        matchTextValue(
          serializeUnknown(record.attributes['reatom.payload']),
          raw,
          op,
        ) || matchLocalValuesText(record, raw, op)
      )
    case 'state':
      return (
        matchTextValue(serializeUnknown(record.body), raw, op) ||
        matchLocalValuesText(record, raw, op)
      )
    case 'event':
      return matchTextValue(record.eventName ?? '', raw, op)
    case 'kind':
      return matchKindField(record, raw)
    case 'outcome':
      return matchTextValue(record.outcome ?? '', raw, op)
    case 'duration': {
      const duration = recordDurationMs(record)
      if (duration === undefined) return false
      return matchNumeric(duration, op, raw)
    }
    case 'spans': {
      if (index === undefined) return false
      return matchNumeric(
        index.spanCountByTrace.get(record.traceId) ?? 0,
        op,
        raw,
      )
    }
    case 'errors':
      return isFalsey(raw) ? !recordHasError(record) : recordHasError(record)
    case 'trace':
      return matchTextValue(record.traceId, raw, op === ':' ? '=' : op)
    case 'session':
      return [
        record.attributes['session.id'],
        record.resource['service.instance.id'],
      ].some(
        (value) =>
          value !== undefined &&
          matchTextValue(serializeUnknown(value), raw, op),
      )
    case 'route':
      return matchRouteField(record, raw, op)
    case 'source':
      return matchTextValue(record.sourceId, raw, op)
    default:
      if (field.startsWith('attr.')) {
        return matchAttr(record, field.slice('attr.'.length), op, raw)
      }
      return false
  }
}

function matchAttr(
  record: AdminRecord,
  path: string,
  op: CalculatorCompareOp,
  raw: string,
): boolean {
  const actual = attrValue(record, path)
  if (actual === undefined) return false
  if (op === '>' || op === '<' || op === '>=' || op === '<=') {
    const numeric = typeof actual === 'number' ? actual : Number(actual)
    if (!Number.isFinite(numeric)) return false
    return matchNumeric(numeric, op, raw)
  }
  return matchTextValue(serializeUnknown(actual), raw, op)
}

function parentFrameKeys(record: AdminRecord): string[] {
  const node = toRailNode(record)
  if (!node) return []
  return node.parentIds.map((parentId) =>
    frameRecordKey(record.traceId, String(parentId)),
  )
}

export function buildCalculatorIndex(
  records: readonly AdminRecord[],
): CalculatorRecordIndex {
  const byFrame = framedByFrameId(records)
  const children = new Map<string, string[]>()
  const spanCountByTrace = new Map<string, number>()
  for (const [key, record] of byFrame) {
    for (const parentKey of parentFrameKeys(record)) {
      const list = children.get(parentKey)
      if (list) list.push(key)
      else children.set(parentKey, [key])
    }
  }
  for (const record of records) {
    if (record.kind !== 'span') continue
    spanCountByTrace.set(
      record.traceId,
      (spanCountByTrace.get(record.traceId) ?? 0) + 1,
    )
  }
  return { records, byFrame, children, spanCountByTrace }
}

function asRecordIndex(
  index?: CalculatorRecordIndex | readonly AdminRecord[],
): CalculatorRecordIndex | undefined {
  if (index === undefined) return undefined
  if ('byFrame' in index) return index
  return buildCalculatorIndex(index)
}

function matchCauseGreater(
  record: AdminRecord,
  pattern: string,
  index: CalculatorRecordIndex,
): boolean {
  const visited = new Set<string>()
  const queue = parentFrameKeys(record)
  while (queue.length > 0) {
    const key = queue.shift()!
    if (visited.has(key)) continue
    visited.add(key)
    const ancestor = index.byFrame.get(key)
    if (!ancestor) continue
    if (matchNameField(ancestor, pattern, ':')) return true
    queue.push(...parentFrameKeys(ancestor))
  }
  return false
}

function matchCauseLess(
  record: AdminRecord,
  pattern: string,
  index: CalculatorRecordIndex,
): boolean {
  if (record.frameId === undefined) return false
  const childKeys = index.children.get(
    frameRecordKey(record.traceId, record.frameId),
  )
  if (childKeys === undefined) return false
  for (const childKey of childKeys) {
    const child = index.byFrame.get(childKey)
    if (child && matchNameField(child, pattern, ':')) return true
  }
  return false
}

function matchCausePredicate(
  record: AdminRecord,
  predicate: CausePredicate,
  index: CalculatorRecordIndex | undefined,
): boolean {
  if (index === undefined) return false
  if (predicate.direction === '>') {
    return matchCauseGreater(record, predicate.referencePattern, index)
  }
  return matchCauseLess(record, predicate.referencePattern, index)
}

function matchPredicate(
  record: AdminRecord,
  predicate: FilterPredicate,
  index: CalculatorRecordIndex | undefined,
): boolean {
  switch (predicate.type) {
    case 'attr': {
      const value = predicate.value as CalculatorAttrValue
      return matchAttr(record, value.path, value.op, value.raw)
    }
    case 'compare': {
      const value = predicate.value as CalculatorCompareValue
      return matchCompare(record, value.field, value.op, value.raw, index)
    }
    case 'cause':
      return matchCausePredicate(record, predicate as CausePredicate, index)
    default:
      return false
  }
}

export function evaluateRecordExpression(
  record: AdminRecord,
  expression: FilterGroup,
  tags: FilterTag[],
  index?: CalculatorRecordIndex | readonly AdminRecord[],
): boolean {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]))
  const resolved = asRecordIndex(index)

  function evalChild(child: FilterTagRef | FilterGroup): boolean {
    if (isTagRef(child)) {
      const tag = tagById.get(child.tagId)
      if (!tag) return false
      const matched = tag.predicates.every((predicate) =>
        matchPredicate(record, predicate, resolved),
      )
      return child.negated ? !matched : matched
    }
    return evaluateRecordExpression(record, child, tags, resolved)
  }

  if (expression.children.length === 0) return true
  if (expression.operator === 'AND') return expression.children.every(evalChild)
  return expression.children.some(evalChild)
}

export function parseFilterCalculator(
  filter: { calculator?: string } | undefined,
): CalculatorParse | undefined {
  const source = filter?.calculator
  if (source === undefined || source.trim() === '') return undefined
  return parseCalculator(source)
}

export function recordMatchesCalculator(
  record: AdminRecord,
  parsed: CalculatorParse | undefined,
  index?: CalculatorRecordIndex | readonly AdminRecord[],
): boolean {
  if (parsed === undefined) return true
  if (!parsed.ok) return false
  return evaluateRecordExpression(record, parsed.expression, parsed.tags, index)
}
