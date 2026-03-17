import addonVitest from '@storybook/addon-vitest'
import type { HtmlRenderer } from '@storybook/html-vite'
import {
  definePreview as defineCsfPreview,
  type InferTypes,
  type Preview,
  type PreviewAddon,
  type ProjectAnnotations,
} from 'storybook/internal/csf'

import previewAnnotations from './preview'

function definePreview<Addons extends PreviewAddon<never>[]>(
  input: ProjectAnnotations<HtmlRenderer> & { addons?: Addons },
): Preview<HtmlRenderer & InferTypes<Addons>> {
  return defineCsfPreview<HtmlRenderer, Addons>(input)
}

const preview = definePreview({
  ...previewAnnotations,
  addons: [addonVitest()],
})

export default preview
