/*
Requirements for this loader:
- Build the `reference` collection directly from configured package sources, without a Typedoc prebuild step.
- Parse public exports from package `src` folders (or configured single files), and use package README files only for entries configured with `mode: 'readme'`.
- Keep only human-written docs content: description text, remarks, deprecation notes, and `@example` blocks.
- Exclude all type-only API entries and private/internal implementation details: skip interfaces, type aliases, `@private`, `@internal`, and names starting with `_`.
- Merge docs across overloads for the same runtime symbol and render the result as markdown for Astro/Starlight pages.
*/

import { access, readFile, stat } from 'node:fs/promises'
import { basename, dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import type { Loader } from 'astro/loaders'
import { z } from 'astro/zod'
import fg from 'fast-glob'
import * as ts from 'typescript'

type PackageSelector =
  | string
  | {
      path: string
      mode?: 'jsdoc' | 'readme'
      slug?: string
      title?: string
      packageName?: string
    }

type NormalizedSelector = {
  path: string
  mode: 'jsdoc' | 'readme'
  slug?: string
  title?: string
  packageName?: string
}

type ReferenceExample = {
  caption?: string
  code: string
}

type ReferenceEntry = {
  id: string
  data: {
    title: string
    description?: string
    sourcePath: string
    packageName?: string
    symbols: Array<{
      name: string
      kind: string
      description?: string
      examples: Array<ReferenceExample>
      sourcePath: string
    }>
  }
  markdown: string
  fileURL: URL
}

type SymbolDoc = {
  name: string
  kind: string
  description?: string
  examples: Array<ReferenceExample>
  sourcePath: string
  sortPath: string
  sortPos: number
}

type PackageMetadata = {
  packageName?: string
  packageDescription?: string
}

const sourceSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  sourcePath: z.string(),
  packageName: z.string().optional(),
  symbols: z.array(
    z.object({
      name: z.string(),
      kind: z.string(),
      description: z.string().optional(),
      examples: z.array(
        z.object({
          caption: z.string().optional(),
          code: z.string(),
        }),
      ),
      sourcePath: z.string(),
    }),
  ),
})

const SOURCE_FILE_PATTERNS = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']
const SOURCE_IGNORE_PATTERNS = [
  '**/*.d.ts',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.stories.*',
  '**/__tests__/**',
  '**/__mocks__/**',
]

const DECLARATION_KINDS: Partial<Record<ts.SyntaxKind, string>> = {
  [ts.SyntaxKind.FunctionDeclaration]: 'function',
  [ts.SyntaxKind.ClassDeclaration]: 'class',
  [ts.SyntaxKind.InterfaceDeclaration]: 'interface',
  [ts.SyntaxKind.TypeAliasDeclaration]: 'type',
  [ts.SyntaxKind.EnumDeclaration]: 'enum',
  [ts.SyntaxKind.VariableStatement]: 'variable',
}

export function jsdocLoader({
  packages,
}: {
  packages: Array<PackageSelector>
}): Loader {
  return {
    name: 'reatom-jsdoc-loader',
    schema: sourceSchema,
    load: async ({
      config,
      generateDigest,
      logger,
      meta,
      parseData,
      renderMarkdown,
      store,
      watcher,
    }) => {
      const docsRoot = fileURLToPath(config.root)
      const repoRoot = resolve(docsRoot, '..')
      const selectors = packages.map(normalizeSelector)

      const syncStore = async () => {
        const results = await Promise.all(
          selectors.map((sel) => buildEntry(sel, config.root, repoRoot)),
        )

        const seenIds = new Set<string>()
        const duplicateIds: Array<string> = []
        for (const { entry } of results) {
          if (seenIds.has(entry.id)) duplicateIds.push(entry.id)
          seenIds.add(entry.id)
        }
        if (duplicateIds.length > 0) {
          throw new Error(
            `Duplicate reference ids: ${duplicateIds.map((id) => `"${id}"`).join(', ')}`,
          )
        }

        store.clear()

        for (const { entry } of results) {
          if (
            entry.data.symbols.length === 0 &&
            entry.markdown.trim().length === 0 &&
            entry.data.description === undefined
          ) {
            logger.warn(
              `No docs found for "${entry.id}" from ${entry.data.sourcePath}`,
            )
          }

          const data = await parseData({ id: entry.id, data: entry.data })
          store.set({
            id: entry.id,
            data,
            digest: generateDigest({
              id: entry.id,
              data,
              markdown: entry.markdown,
            }),
            rendered: await renderMarkdown(entry.markdown, {
              fileURL: entry.fileURL,
            }),
          })
        }

        return results
      }

      const results = await syncStore()

      if (meta.get('watch-registered') === 'true') return
      meta.set('watch-registered', 'true')

      const allWatchPaths = dedupeBy(
        results.flatMap((r) => r.watchPaths),
        normalizePath,
      )
      watcher?.add(allWatchPaths)
      watcher?.on('all', async (_event, changedPath) => {
        const normalizedChanged = normalizePath(resolve(changedPath))
        const isRelevant = allWatchPaths.some((wp) =>
          isWithin(normalizedChanged, normalizePath(wp)),
        )
        if (!isRelevant) return

        logger.info(
          `Reloading reference docs for ${normalizeRelativePath(relative(repoRoot, normalizedChanged))}`,
        )
        await syncStore()
      })
    },
  } satisfies Loader
}

function normalizeSelector(selector: PackageSelector): NormalizedSelector {
  if (typeof selector === 'string') {
    return { path: selector, mode: 'jsdoc' }
  }
  return {
    path: selector.path,
    mode: selector.mode ?? 'jsdoc',
    slug: selector.slug,
    title: selector.title,
    packageName: selector.packageName,
  }
}

async function buildEntry(
  selector: NormalizedSelector,
  configRoot: URL,
  repoRoot: string,
): Promise<{ entry: ReferenceEntry; watchPaths: Array<string> }> {
  const absolutePath = await resolveSelectorPath(configRoot, selector.path)
  const isDirectory = (await stat(absolutePath)).isDirectory()

  const packageJsonPath = await resolveNearestFile(
    absolutePath,
    isDirectory,
    'package.json',
  )
  const metadata: PackageMetadata = packageJsonPath
    ? parsePackageJson(await readFile(packageJsonPath, 'utf8'))
    : {}

  const slug =
    selector.slug ??
    (selector.packageName ?? metadata.packageName)?.split('/').pop() ??
    deriveSlug(absolutePath)
  const title =
    selector.title ??
    selector.packageName ??
    metadata.packageName ??
    titleFromSlug(slug)
  const packageName = selector.packageName ?? metadata.packageName

  const watchPaths = [absolutePath]
  if (packageJsonPath) watchPaths.push(packageJsonPath)

  if (selector.mode === 'readme') {
    const readmePath = await resolveNearestFile(
      absolutePath,
      isDirectory,
      'README.md',
    )
    if (readmePath) watchPaths.push(readmePath)
    const markdown = readmePath ? await readFile(readmePath, 'utf8') : ''

    return {
      entry: {
        id: slug,
        data: {
          title,
          description: metadata.packageDescription,
          sourcePath: normalizeRelativePath(
            relative(repoRoot, readmePath ?? absolutePath),
          ),
          packageName,
          symbols: [],
        },
        markdown,
        fileURL: pathToFileURL(readmePath ?? absolutePath),
      },
      watchPaths,
    }
  }

  const entryFile = await resolveEntryFile(absolutePath, isDirectory)
  const sourceFiles = await collectSourceFiles(
    absolutePath,
    isDirectory,
    entryFile,
  )
  const symbols = extractPublicSymbols({
    entryFile,
    repoRoot,
    scopePath: absolutePath,
    sourceFiles,
  })
  const markdown = renderSymbolsMarkdown(symbols, metadata.packageDescription)

  return {
    entry: {
      id: slug,
      data: {
        title,
        description: metadata.packageDescription,
        sourcePath: normalizeRelativePath(relative(repoRoot, absolutePath)),
        packageName,
        symbols: symbols.map(
          ({ name, kind, description, examples, sourcePath }) => ({
            name,
            kind,
            description,
            examples,
            sourcePath,
          }),
        ),
      },
      markdown,
      fileURL: pathToFileURL(entryFile),
    },
    watchPaths,
  }
}

async function resolveSelectorPath(
  configRoot: URL,
  inputPath: string,
): Promise<string> {
  const docsRoot = fileURLToPath(configRoot)
  const repoRoot = resolve(docsRoot, '..')

  for (const base of [docsRoot, repoRoot]) {
    const candidate = resolve(base, inputPath)
    if (await pathExists(candidate)) return candidate
  }

  throw new Error(`Reference source not found: ${inputPath}`)
}

async function resolveNearestFile(
  absolutePath: string,
  isDirectory: boolean,
  fileName: string,
): Promise<string | undefined> {
  if (!isDirectory) return undefined

  const candidates = [resolve(absolutePath, fileName)]
  if (basename(absolutePath) === 'src') {
    candidates.push(resolve(dirname(absolutePath), fileName))
  }

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate
  }
  return undefined
}

async function resolveEntryFile(
  absolutePath: string,
  isDirectory: boolean,
): Promise<string> {
  if (!isDirectory) return absolutePath

  for (const ext of ['.ts', '.tsx', '.mts', '.cts']) {
    const entryFile = resolve(absolutePath, `index${ext}`)
    if (await pathExists(entryFile)) return entryFile
  }

  const sourceFiles = await collectSourceFiles(absolutePath, true)
  if (sourceFiles.length === 1) return sourceFiles[0]

  throw new Error(`Expected an entry file in ${absolutePath}`)
}

async function collectSourceFiles(
  absolutePath: string,
  isDirectory: boolean,
  entryFile?: string,
): Promise<Array<string>> {
  if (!isDirectory) return [absolutePath]

  const matched = await fg(SOURCE_FILE_PATTERNS, {
    cwd: absolutePath,
    absolute: true,
    onlyFiles: true,
    ignore: SOURCE_IGNORE_PATTERNS,
  })
  const sourceFiles = matched.filter(
    (filePath): filePath is string => typeof filePath === 'string',
  )
  const files = entryFile ? [...sourceFiles, entryFile] : sourceFiles

  return dedupeBy(
    files.map((filePath) => resolve(filePath)),
    normalizePath,
  ).sort()
}

function extractPublicSymbols({
  entryFile,
  repoRoot,
  scopePath,
  sourceFiles,
}: {
  entryFile: string
  repoRoot: string
  scopePath: string
  sourceFiles: Array<string>
}): Array<SymbolDoc> {
  const program = ts.createProgram(sourceFiles, {
    allowJs: false,
    checkJs: false,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  })
  const checker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(entryFile)

  if (!sourceFile) throw new Error(`Unable to read ${entryFile}`)

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
  if (!moduleSymbol) return []

  const symbols: Array<SymbolDoc> = []

  for (const exportSymbol of checker.getExportsOfModule(moduleSymbol)) {
    const publicName = exportSymbol.getName()
    if (publicName === 'default' || publicName.startsWith('_')) continue

    const targetSymbol =
      exportSymbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exportSymbol)
        : exportSymbol

    if (targetSymbol.getName().startsWith('_')) continue

    const symbolDoc = collectSymbolDoc({
      publicName,
      repoRoot,
      scopePath,
      targetSymbol,
    })
    if (symbolDoc) symbols.push(symbolDoc)
  }

  return symbols.sort((a, b) =>
    a.sortPath !== b.sortPath
      ? a.sortPath.localeCompare(b.sortPath)
      : a.sortPos !== b.sortPos
        ? a.sortPos - b.sortPos
        : a.name.localeCompare(b.name),
  )
}

function collectSymbolDoc({
  publicName,
  repoRoot,
  scopePath,
  targetSymbol,
}: {
  publicName: string
  repoRoot: string
  scopePath: string
  targetSymbol: ts.Symbol
}): SymbolDoc | undefined {
  const declarations = targetSymbol.getDeclarations() ?? []
  const allDescriptions: Array<string> = []
  const allExamples: Array<ReferenceExample> = []
  let kind = 'symbol'
  let sortPath = ''
  let sortPos = Number.MAX_SAFE_INTEGER
  let sourcePath = ''

  const normalizedScope = normalizePath(scopePath)

  for (const declaration of declarations) {
    const node = toDocumentableNode(declaration)
    if (!node) continue
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
      continue
    if (getDeclaredNames(node).some((n) => n.startsWith('_'))) continue
    if (hasJsDocTag(node, 'internal')) continue

    const sf = node.getSourceFile()
    if (!isWithin(normalizePath(sf.fileName), normalizedScope)) continue

    if (sortPos === Number.MAX_SAFE_INTEGER) {
      kind = DECLARATION_KINDS[node.kind] ?? 'symbol'
      sortPath = normalizeRelativePath(relative(repoRoot, sf.fileName))
      sortPos = node.getStart(sf)
      sourcePath = sortPath
    }

    const { descriptions, examples } = extractDocContent(node, sf)
    allDescriptions.push(...descriptions)
    allExamples.push(...examples)
  }

  const descriptions = dedupeBy(allDescriptions, (d) => d)
  const examples = dedupeBy(allExamples, (e) => `${e.caption ?? ''}\0${e.code}`)

  if (descriptions.length === 0 && examples.length === 0) return undefined

  return {
    name: publicName,
    kind,
    description:
      descriptions.length > 0 ? descriptions.join('\n\n') : undefined,
    examples,
    sourcePath,
    sortPath,
    sortPos,
  }
}

function toDocumentableNode(declaration: ts.Declaration): ts.Node | undefined {
  if (ts.isVariableDeclaration(declaration)) return declaration.parent.parent
  if (ts.isBindingElement(declaration)) return declaration.parent.parent.parent
  if (ts.isImportSpecifier(declaration) || ts.isExportSpecifier(declaration)) {
    return undefined
  }
  return declaration
}

function extractDocContent(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): { descriptions: Array<string>; examples: Array<ReferenceExample> } {
  const descriptions: Array<string> = []
  const examples: Array<ReferenceExample> = []

  for (const jsDoc of ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc)) {
    const tags = jsDoc.tags ? Array.from(jsDoc.tags).filter(isJsDocTagLike) : []
    const tagNames = new Set(tags.map((t) => t.tagName.text))

    if (tagNames.has('private') || tagNames.has('internal')) continue

    const descParts: Array<string> = []
    const primaryDesc = normalizeDescription(
      jsDocCommentToString(jsDoc.comment, sourceFile),
    )
    if (primaryDesc.length > 0) descParts.push(primaryDesc)

    for (const tag of tags) {
      if (tag.tagName.text === 'remarks') {
        const remarks = normalizeDescription(
          jsDocCommentToString(tag.comment, sourceFile),
        )
        if (remarks.length > 0) descParts.push(remarks)
      }
    }

    const deprecatedTag = tags.find((t) => t.tagName.text === 'deprecated')
    if (deprecatedTag) {
      const deprecation = normalizeDescription(
        jsDocCommentToString(deprecatedTag.comment, sourceFile),
      )
      descParts.unshift(
        deprecation.length > 0
          ? `**Deprecated.** ${deprecation}`
          : '**Deprecated.**',
      )
    }

    const blockExamples = tags
      .filter((t) => t.tagName.text === 'example')
      .map((t) => parseExample(jsDocCommentToString(t.comment, sourceFile)))
      .filter((e): e is ReferenceExample => e !== undefined)

    const description =
      descParts.length > 0 ? descParts.join('\n\n') : undefined

    if (description) descriptions.push(description)
    examples.push(...blockExamples)
  }

  return { descriptions, examples }
}

function jsDocCommentToString(
  comment: unknown,
  sourceFile: ts.SourceFile,
): string {
  if (comment === undefined) return ''
  if (typeof comment === 'string')
    return normalizeInlineTags(stripJsDocSyntax(comment))

  if (isIterable(comment)) {
    const joined = joinCommentSegments(
      Array.from(comment).map((part) =>
        typeof part === 'string'
          ? part
          : hasGetText(part)
            ? part.getText(sourceFile)
            : '',
      ),
    )
    return normalizeInlineTags(stripJsDocSyntax(joined))
  }

  return hasGetText(comment)
    ? normalizeInlineTags(stripJsDocSyntax(comment.getText(sourceFile)))
    : ''
}

function normalizeInlineTags(text: string): string {
  return text
    .replace(
      /\{@(?:link|linkcode|linkplain)\s+([^}\s|]+)(?:\s*\|\s*([^}]+)|\s+([^}]+))?\}/g,
      (_match, target: string, pipeLabel?: string, spacedLabel?: string) => {
        const label = (pipeLabel ?? spacedLabel ?? target).trim()
        return `\`${label}\``
      },
    )
    .replace(
      /\{@code\s+([^}]+)\}/g,
      (_match, value: string) => `\`${value.trim()}\``,
    )
    .replace(/\{@inheritDoc\s+([^}]+)\}/g, (_match, value: string) => {
      return `Inherited from \`${value.trim()}\`.`
    })
    .replace(/(?<=[\p{L}\p{N}_])`/gu, ' `')
    .replace(/`(?=[\p{L}\p{N}_])/gu, '` ')
}

function normalizeDescription(text: string): string {
  const lines = text
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trimEnd())

  const blocks: Array<string> = []
  let paragraph: Array<string> = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push(paragraph.join(' ').replace(/\s+/g, ' ').trim())
    paragraph = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      flushParagraph()
      continue
    }

    const isBlockLine =
      /^[-*+]\s/.test(trimmed) ||
      /^\d+\.\s/.test(trimmed) ||
      /^>/.test(trimmed) ||
      /^#{1,6}\s/.test(trimmed)

    if (isBlockLine) {
      flushParagraph()
      blocks.push(trimmed)
      continue
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  return blocks.join('\n\n').trim()
}

function parseExample(text: string): ReferenceExample | undefined {
  const normalized = dedent(
    stripJsDocSyntax(text).replaceAll('\r\n', '\n'),
  ).trim()
  if (normalized.length === 0) return undefined

  const captionMatch = normalized.match(
    /^<caption>([\s\S]*?)<\/caption>(?:\n+([\s\S]*))?$/,
  )
  if (captionMatch) {
    const caption = normalizeDescription(captionMatch[1] ?? '')
    const code = dedent(captionMatch[2] ?? '').trim()
    return {
      caption: caption.length > 0 ? caption : undefined,
      code,
    }
  }

  return { code: normalized }
}

function renderSymbolsMarkdown(
  symbols: Array<SymbolDoc>,
  packageDescription?: string,
): string {
  const parts: Array<string> = []

  if (packageDescription) {
    const description = normalizeDescription(packageDescription)
    if (description.length > 0) parts.push(description)
  }

  for (const symbol of symbols) {
    parts.push(renderSymbolMarkdown(symbol))
  }

  return parts.join('\n\n').trim()
}

function renderSymbolMarkdown(symbol: SymbolDoc): string {
  const parts = [`## ${symbol.name}`]

  if (symbol.description && symbol.description.length > 0) {
    parts.push(symbol.description)
  }

  symbol.examples.forEach((example, index) => {
    parts.push(
      symbol.examples.length === 1 ? '### Example' : `### Example ${index + 1}`,
    )

    if (example.caption && example.caption.length > 0) {
      parts.push(example.caption)
    }

    parts.push(['```ts', example.code, '```'].join('\n'))
  })

  return parts.join('\n\n')
}

function getDeclaredNames(node: ts.Node): Array<string> {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.name ? [node.name.text] : []
  }

  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap((decl) =>
      getBindingNames(decl.name),
    )
  }

  return []
}

function getBindingNames(name: ts.BindingName): Array<string> {
  if (ts.isIdentifier(name)) return [name.text]
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    return name.elements.flatMap((el) =>
      ts.isOmittedExpression(el) ? [] : getBindingNames(el.name),
    )
  }
  return []
}

function hasJsDocTag(node: ts.Node, tagName: string): boolean {
  return ts
    .getJSDocCommentsAndTags(node)
    .flatMap((entry) =>
      ts.isJSDoc(entry) ? (entry.tags ? Array.from(entry.tags) : []) : [entry],
    )
    .filter(isJsDocTagLike)
    .some((tag) => tag.tagName.text === tagName)
}

function deriveSlug(absolutePath: string): string {
  const name = basename(absolutePath, extname(absolutePath))
  return name === 'src' ? basename(dirname(absolutePath)) : name
}

function titleFromSlug(slug: string): string {
  return slug
    .split(/[-_]/g)
    .filter((s) => s.length > 0)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(' ')
}

function isWithin(normalizedChild: string, normalizedParent: string): boolean {
  return (
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(`${normalizedParent}/`)
  )
}

function normalizePath(path: string): string {
  return resolve(path).replaceAll('\\', '/')
}

function normalizeRelativePath(path: string): string {
  return path.replaceAll('\\', '/')
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function stripJsDocSyntax(text: string): string {
  const lines = text.replaceAll('\r\n', '\n').split('\n')
  return lines
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed !== '/**' && trimmed !== '*/'
    })
    .map((line) => line.replace(/^\s*\*( ?)/u, ''))
    .join('\n')
}

function joinCommentSegments(segments: Array<string>): string {
  return segments.reduce((result, segment) => {
    if (segment.length === 0) return result
    if (result.length === 0) return segment

    const prevChar = result[result.length - 1]
    const nextChar = segment[0]

    if (
      !/\s/u.test(prevChar) &&
      !/\s/u.test(nextChar) &&
      /[\p{L}\p{N}_`)]/u.test(prevChar) &&
      /[\p{L}\p{N}_`(]/u.test(nextChar)
    ) {
      return `${result} ${segment}`
    }

    return `${result}${segment}`
  }, '')
}

function dedent(text: string): string {
  const lines = text.replaceAll('\r\n', '\n').split('\n')
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)

  if (nonEmptyLines.length === 0) return text.trim()

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => line.match(/^\s*/)?.[0].length ?? 0),
  )

  return lines
    .map((line) => line.slice(minIndent))
    .join('\n')
    .trim()
}

function parsePackageJson(content: string): PackageMetadata {
  const rawValue: unknown = JSON.parse(content)
  if (!isRecord(rawValue)) return {}

  return {
    packageName: typeof rawValue.name === 'string' ? rawValue.name : undefined,
    packageDescription:
      typeof rawValue.description === 'string'
        ? rawValue.description
        : undefined,
  }
}

function dedupeBy<Item>(
  items: Array<Item>,
  getKey: (item: Item) => string,
): Array<Item> {
  const seen = new Set<string>()
  const result: Array<Item> = []
  for (const item of items) {
    const key = getKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return isRecord(value) && Symbol.iterator in value
}

function hasGetText(
  value: unknown,
): value is { getText(sourceFile?: ts.SourceFile): string } {
  return (
    isRecord(value) && 'getText' in value && typeof value.getText === 'function'
  )
}

function isJsDocTagLike(
  value: unknown,
): value is { tagName: { text: string }; comment?: unknown } {
  return (
    isRecord(value) &&
    'tagName' in value &&
    isRecord(value.tagName) &&
    typeof value.tagName.text === 'string'
  )
}
