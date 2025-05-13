import { getCollection } from 'astro:content'

export const docsPages = await getCollection('docs')
export const packagesPages = await getCollection('packages')
export const allPages = [...docsPages, ...packagesPages]

console.log(packagesPages.map((a) => a.id))
