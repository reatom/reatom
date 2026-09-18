export const publishedExamples = [
  'lens-calculator',
  'gallery',
] as const

export type PublishedExample = (typeof publishedExamples)[number]
