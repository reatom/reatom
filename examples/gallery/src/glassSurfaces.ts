import { generateGlassDisplacementMap, GLASS_LENS_PRESETS } from './glass'

const surfaces =
  '.gallery-toolbar, .gallery-folder-sidebar, aside[role="dialog"], .gallery-lightbox .lightbox-control-layer'
let nextId = 0

/** Size the optical map to the actual surface, including its curved corners. */
export const bindGlassSurfaces = (root: HTMLElement) => {
  if (root.dataset.glassRefraction !== 'true') return
  const template = root.querySelector<SVGFilterElement>('#glass-pill')
  if (!template?.parentElement) return
  const definitions = template.parentElement
  const records = new Map<HTMLElement, SVGFilterElement>()
  const resize = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const element = target as HTMLElement
      const filter = records.get(element)
      if (!filter) continue
      const width = Math.round(element.clientWidth)
      const height = Math.round(element.clientHeight)
      if (!width || !height) continue
      const radius = getComputedStyle(element).borderTopLeftRadius
      const corner = radius.endsWith('%')
        ? Math.min(width, height) / 2
        : parseFloat(radius)
      // Compact viewer chrome crosses hard photo edges. A panel-strength
      // displacement folds those edges into visible notches along the bezel.
      const viewerControl = element.classList.contains('lightbox-control-layer')
      const map = generateGlassDisplacementMap({
        ...GLASS_LENS_PRESETS.pill,
        width,
        height,
        borderRadius: Math.min(corner, width / 2, height / 2),
        depth: viewerControl ? 12 : 24,
        scale: viewerControl ? 12 : 36,
        curvature: 45,
        chroma: 0,
      })
      filter.querySelector('feImage')!.setAttribute('href', map.href)
      for (const displacement of filter.querySelectorAll('feDisplacementMap')) {
        displacement.setAttribute('scale', String(map.scale))
      }
    }
  })
  const scan = () => {
    const enabled = root.dataset.themePack === 'glass'
    for (const [element, filter] of records) {
      if (!enabled || !root.contains(element)) {
        resize.unobserve(element)
        element.style.removeProperty('--glass-optics')
        filter.remove()
        records.delete(element)
      }
    }
    if (!enabled) return
    for (const element of root.querySelectorAll<HTMLElement>(surfaces)) {
      if (records.has(element)) continue
      const filter = template.cloneNode(true) as SVGFilterElement
      filter.id = `glass-surface-${++nextId}`
      definitions.append(filter)
      element.style.setProperty('--glass-optics', `url(#${filter.id})`)
      records.set(element, filter)
      resize.observe(element)
    }
  }
  const mutations = new MutationObserver(scan)
  mutations.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-theme-pack'],
  })
  scan()
  return () => {
    mutations.disconnect()
    resize.disconnect()
    for (const [element, filter] of records) {
      element.style.removeProperty('--glass-optics')
      filter.remove()
    }
  }
}
