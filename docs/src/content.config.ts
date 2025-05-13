import { defineCollection } from 'astro:content'
import { docsSchema } from '@astrojs/starlight/schema'
import { docsLoader } from '@astrojs/starlight/loaders'
import { allPackages } from '../astro.autogen.js'
import { loader } from '../config/integrations/package-reference.js'

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  packages: defineCollection({ loader: loader(allPackages) }),
}
