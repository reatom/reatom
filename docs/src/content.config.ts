import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { glob } from 'astro/loaders'
import { defineCollection } from 'astro:content'

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // readmes: defineCollection({
  //   loader: glob({
  //     pattern: '*/README.md',
  //     base: '../packages',
  //   }),
  // }),
  reference: defineCollection({
    loader: glob({
      pattern: ['**/*.md'],
      base: '../autodocs',
    }),
  }),
}
