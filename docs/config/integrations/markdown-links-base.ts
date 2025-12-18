import { join } from 'node:path'

import type { AstroIntegration } from 'astro'
import type { Root as MarkdownAstRoot } from 'mdast'
import { visit } from 'unist-util-visit'

export function markdownBaseLinks(): AstroIntegration {
  return {
    name: 'markdown-base-links',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [
              [
                remarkBaseLinks,
                {
                  base: config.base,
                },
              ],
            ],
          },
        })
      },
    },
  }
}

type Config = {
  base: string
}

export function remarkBaseLinks(config: Config) {
  return (tree: MarkdownAstRoot) => {
    visit(tree, (node) => {
      if (node.type !== 'link') return

      const url = node.url
      if (typeof url !== 'string' || url[0] != '/') return

      node.url = join(config.base, url)
    })
  }
}
