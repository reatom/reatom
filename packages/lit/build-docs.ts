import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

// Get __dirname for ESM modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface DocFile {
  content: string
  title?: string
  isMarkdown?: boolean
}

interface JsDocMetadata {
  original: string
  hasDocExpand: boolean
  startIndex: number
  endIndex: number
}

const DOCS_DIR = 'docs'
const OUTPUT_DIR = '../../docs/src/content/docs/handbook/lit'

// Directories to generate individual pages from
const PAGE_DIRECTORIES = [
  'basic',
  'advanced',
  'best-practices',
  'examples',
]

// Files to include on index page (keep as sections)
const INDEX_SECTIONS = [
  { title: 'Quick Start', file: 'basic/quick-start' },
  { title: 'ReatomLitElement', file: 'basic/reatom-lit-element' },
  { title: 'watch Directive', file: 'basic/watch-directive' },
  { title: 'Automatic Reactivity', file: 'basic/auto-reactivity' },
]

/**
 * Parse JSDoc comment block into markdown text
 */
function parseJsDocToMarkdown(jsDoc: string, skipFirstLine: boolean = false): string {
  let result = jsDoc
    // Remove opening and closing comment markers
    .replace(/\/\*\*/, '')
    .replace(/\*\//, '')
    // Remove leading asterisks from each line
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    // Remove @file and @description tags with their content
    .replace(/@file[^\n]*/g, '')
    .replace(/@description[^\n]*/g, '')
    // Remove @doc-expand tag
    .replace(/@doc-expand[^\n]*/g, '')
    .trim()

  // Skip first line if it's a title (to avoid duplication)
  if (skipFirstLine) {
    const lines = result.split('\n')
    if (lines.length > 0) {
      const firstLine = lines[0].trim()
      // Remove if it looks like a title (no special chars, not a tag)
      if (firstLine && !firstLine.startsWith('@') && !firstLine.startsWith('http')) {
        lines.shift()
        result = lines.join('\n').trim()
      }
    }
  }

  return result
}

/**
 * Check if JSDoc comment contains @doc-expand tag
 */
function hasDocExpandTag(jsDoc: string): boolean {
  return /@doc-expand\b/.test(jsDoc)
}

/**
 * Extract content from a TypeScript file, converting JSDoc comments to markdown
 * and keeping code blocks separate
 */
function extractFromTsFile(filePath: string, skipFirstTitleLine: boolean = false): DocFile {
  const fileContent = readFileSync(filePath, 'utf-8')

  // Regex to match JSDoc comments
  const jsDocRegex = /\/\*\*[\s\S]*?\*\//g

  // Find all JSDoc comments with metadata
  const jsDocComments: JsDocMetadata[] = []
  let match: RegExpExecArray | null
  let isFirstDocExpand = true

  while ((match = jsDocRegex.exec(fileContent)) !== null) {
    const hasDocExpand = hasDocExpandTag(match[0])
    jsDocComments.push({
      original: match[0],
      hasDocExpand,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })

    if (hasDocExpand) {
      isFirstDocExpand = false
    }
  }

  // Build segments: code blocks and expanded markdown
  const finalSegments: Array<{ type: 'code' | 'markdown'; content: string }> = []
  let currentCodeBlock = ''

  let lastIndex = 0
  let skipTitleForNext = skipFirstTitleLine

  for (const jsDoc of jsDocComments) {
    if (!jsDoc.hasDocExpand) {
      // This JSDoc should stay in code block - will be included with next code
      // Just continue, the JSDoc will be included when we flush code block
      continue
    }

    // This JSDoc should be expanded as markdown
    // Add everything from lastIndex to jsDoc.startIndex as code (includes previous non-expandable JSDocs)
    if (jsDoc.startIndex > lastIndex) {
      const codeContent = fileContent.slice(lastIndex, jsDoc.startIndex).trim()
      if (codeContent) {
        currentCodeBlock += (currentCodeBlock ? '\n\n' : '') + codeContent
      }
    }

    // Flush current code block if we have one
    if (currentCodeBlock.trim()) {
      finalSegments.push({ type: 'code', content: currentCodeBlock.trim() })
      currentCodeBlock = ''
    }

    // Add the expanded JSDoc as markdown
    const markdown = parseJsDocToMarkdown(jsDoc.original, skipTitleForNext)
    skipTitleForNext = false // Only skip for the first doc-expand block
    if (markdown) {
      finalSegments.push({ type: 'markdown', content: markdown })
    }

    lastIndex = jsDoc.endIndex
  }

  // Add remaining code
  if (lastIndex < fileContent.length) {
    const remainingCode = fileContent.slice(lastIndex).trim()
    if (remainingCode) {
      currentCodeBlock += (currentCodeBlock ? '\n\n' : '') + remainingCode
    }
  }

  if (currentCodeBlock.trim()) {
    finalSegments.push({ type: 'code', content: currentCodeBlock.trim() })
  }

  // Build final content string
  let result = ''
  for (const segment of finalSegments) {
    if (segment.type === 'markdown') {
      result += `${segment.content}\n\n`
    } else {
      result += `\`\`\`ts\n${segment.content}\n\`\`\`\n\n`
    }
  }

  return {
    content: result.trim(),
    isMarkdown: true,
  }
}

function extractFromMdFile(filePath: string): DocFile {
  const content = readFileSync(filePath, 'utf-8')
  return {
    content: content.trim(),
    isMarkdown: true,
  }
}

function extractFromFile(filePath: string, skipTitle: boolean = false): DocFile {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  if (filePath.endsWith('.md')) {
    return extractFromMdFile(filePath)
  }

  return extractFromTsFile(filePath, skipTitle)
}

/**
 * Extract title from first JSDoc or use filename
 * Also removes the title line from the content to avoid duplication
 */
function extractTitleFromFile(filePath: string): { title: string; contentToSkip?: string } {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const jsDocRegex = /\/\*\*([\s\S]*?)\*\//
    const match = content.match(jsDocRegex)

    if (match) {
      const jsDocContent = match[1]
      // Look for title patterns (first line or @title)
      const lines = jsDocContent.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim())
      for (const line of lines) {
        if (line && !line.startsWith('@') && !line.startsWith('http')) {
          return { title: line, contentToSkip: line }
        }
      }
    }

    // Fallback to filename
    const title = basename(filePath, '.ts')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    return { title }
  } catch {
    return { title: basename(filePath, '.ts') }
  }
}

interface GeneratedPage {
  slug: string
  title: string
  description: string
  filePath: string
  skipTitle: boolean
}

/**
 * Scan directories and generate page configurations
 */
function generatePageConfigs(): GeneratedPage[] {
  const pages: GeneratedPage[] = []

  for (const dir of PAGE_DIRECTORIES) {
    const dirPath = join(__dirname, DOCS_DIR, dir)

    if (!existsSync(dirPath)) {
      console.warn(`⚠️  Directory not found: ${dirPath}`)
      continue
    }

    const files = readdirSync(dirPath).filter(f => f.endsWith('.ts') || f.endsWith('.md'))

    for (const file of files) {
      const filePath = join(dirPath, file)
      const fileName = basename(file, file.endsWith('.ts') ? '.ts' : '.md')
      const slug = `${dir}/${fileName}`
      const titleInfo = extractTitleFromFile(filePath)

      pages.push({
        slug,
        title: titleInfo.title,
        description: `${titleInfo.title} - Reatom Lit integration`,
        filePath,
        skipTitle: !!titleInfo.contentToSkip,
      })
    }
  }

  return pages.sort((a, b) => a.slug.localeCompare(b.slug))
}

function generatePageMarkdown(
  title: string,
  description: string,
  doc: DocFile,
  navigation?: { prev?: { slug: string; title: string }; next?: { slug: string; title: string } }
): string {
  let markdown = `---\ntitle: ${title}\ndescription: ${description}\n---\n\n`

  markdown += `${doc.content}\n\n`

  // Add navigation links
  if (navigation) {
    markdown += `---\n\n`
    const navParts: string[] = []
    if (navigation.prev) {
      const prevLink = navigation.prev.slug === 'index'
        ? '/handbook/lit/'
        : `/handbook/lit/${navigation.prev.slug}`
      navParts.push(`← [${navigation.prev.title}](${prevLink})`)
    }
    if (navigation.next) {
      navParts.push(`[${navigation.next.title}](/handbook/lit/${navigation.next.slug}) →`)
    }
    if (navParts.length > 0) {
      markdown += navParts.join(' | ') + '\n'
    }
  }

  return markdown
}

function generateIndexPage(): string {
  let markdown = `---\ntitle: Integration with Lit\ndescription: Build reactive Web Components with Reatom and Lit\n---\n\n`

  markdown += `## Introduction\n\n`
  const introPath = join(__dirname, DOCS_DIR, 'intro.md')
  try {
    const introDoc = extractFromFile(introPath)
    markdown += `${introDoc.content}\n\n`
  } catch (err) {
    console.warn(`Warning: Could not read intro.md:`, err)
  }

  // Add sections from INDEX_SECTIONS
  for (const section of INDEX_SECTIONS) {
    markdown += `## ${section.title}\n\n`
    const isMarkdownFile = section.file.endsWith('.md')
    const filePath = join(__dirname, DOCS_DIR, isMarkdownFile ? section.file : `${section.file}.ts`)
    try {
      const doc = extractFromFile(filePath)
      markdown += `${doc.content}\n\n`
    } catch (err) {
      console.warn(`Warning: Could not read ${filePath}:`, err)
    }
  }

  return markdown
}

function main() {
  try {
    const outputDir = join(__dirname, OUTPUT_DIR)

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    // Generate index page
    const indexMarkdown = generateIndexPage()
    const indexPath = join(outputDir, 'index.md')
    writeFileSync(indexPath, indexMarkdown, 'utf-8')
    console.log(`✅ Generated: ${indexPath}`)

    // Generate individual pages for each file
    const pages = generatePageConfigs()

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const prev = i > 0 ? { slug: pages[i - 1].slug, title: pages[i - 1].title } : undefined
      const next = i < pages.length - 1 ? { slug: pages[i + 1].slug, title: pages[i + 1].title } : undefined

      const doc = extractFromFile(page.filePath, page.skipTitle)
      const markdown = generatePageMarkdown(
        page.title,
        page.description,
        doc,
        { prev, next }
      )

      // Handle slugs with subdirectories (e.g., 'basic/reactive-component')
      const fileName = `${page.slug}.md`
      const outputPath = join(outputDir, fileName)

      // Ensure the directory exists for nested paths
      const outputDirPath = dirname(outputPath)
      if (!existsSync(outputDirPath)) {
        mkdirSync(outputDirPath, { recursive: true })
      }

      writeFileSync(outputPath, markdown, 'utf-8')
      console.log(`✅ Generated: ${outputPath}`)
    }

    console.log(`\n✅ Generated ${pages.length + 1} documentation pages (including index)`)
  } catch (err) {
    console.error('❌ Error generating docs:', err)
    process.exit(1)
  }
}

main()
