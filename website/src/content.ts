import { getCollection } from 'astro:content';

export const docsPages = await getCollection('docs');
export const readmesPages = await getCollection('readmes')
export const allPages = [...docsPages, ...readmesPages]
