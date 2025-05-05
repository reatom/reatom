import { defineCollection } from 'astro:content'
import { docsSchema } from '@astrojs/starlight/schema'
import { docsLoader } from '@astrojs/starlight/loaders'
import { glob } from 'astro/loaders'

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  readmes: defineCollection({
    loader: glob({
      pattern: '*/README.md',
      base: '../packages',
    }),
  }),
}
