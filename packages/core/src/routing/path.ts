import type { Rec } from '../utils'

const getPatternName = (part: string) => {
  const start = part.startsWith(':') ? 1 : 0
  const end = part.endsWith('?') ? -1 : undefined
  return start || end ? part.slice(start, end) : part
}

export type PathSegment = {
  name: string
  param: boolean
  optional: boolean
}

export type PathMatch = {
  exact: boolean
  params: Rec
}

const memo = <Argument, Result>(compute: (argument: Argument) => Result) => {
  let lastArgument: Argument | typeof compute = compute
  let lastResult!: Result

  return (argument: Argument): Result => {
    if (lastArgument !== compute && lastArgument === argument) {
      return lastResult
    }
    lastArgument = argument
    lastResult = compute(argument)
    return lastResult
  }
}

const splitPath = memo((path: string) => path.split('/').filter(Boolean))

export const createPathSegments = (path: string): Array<PathSegment> =>
  splitPath(path).map((part, index, parts) => {
    const param = part.startsWith(':')
    return {
      name: getPatternName(part),
      param,
      optional: param && part.endsWith('?') && index === parts.length - 1,
    }
  })

export const getPathParamNames = (segments: Array<PathSegment>): Set<string> =>
  new Set(
    segments.filter((segment) => segment.param).map((segment) => segment.name),
  )

export const matchPath = (
  segments: Array<PathSegment>,
  pathname: string,
  hasNoExplicitPath: boolean,
): PathMatch | null => {
  const parts = splitPath(pathname)
  const optionalLastSegment = segments.at(-1)?.optional === true
  if (parts.length < segments.length - (optionalLastSegment ? 1 : 0)) {
    return null
  }

  const params: Rec = {}
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!
    const pathPart = parts[i]
    if (pathPart === undefined && segment.optional) continue
    if (pathPart === undefined) return null
    if (segment.param) {
      try {
        params[segment.name] = decodeURIComponent(pathPart)
      } catch {
        return null
      }
    } else if (segment.name !== pathPart) return null
  }

  const exact =
    hasNoExplicitPath && segments.length === 0
      ? true
      : parts.length === segments.length ||
        (optionalLastSegment && parts.length === segments.length - 1)

  return { exact, params }
}
