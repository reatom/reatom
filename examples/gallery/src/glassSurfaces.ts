import { generateGlassDisplacementMap, GLASS_LENS_PRESETS } from './glass'

export type GlassSurfaceKind = 'panel' | 'viewer'

type GlassSurfaceRecord = {
  element: HTMLElement
  kind: GlassSurfaceKind
}

const registeredSurfaces = new Set<GlassSurfaceRecord>()
const scanListeners = new Set<() => void>()

const notifyGlassSurfaceChange = () => {
  for (const scan of scanListeners) scan()
}

export const registerGlassSurface = (kind: GlassSurfaceKind) => {
  return (element: HTMLElement) => {
    const record: GlassSurfaceRecord = { element, kind }
    registeredSurfaces.add(record)
    notifyGlassSurfaceChange()
    return () => {
      registeredSurfaces.delete(record)
      notifyGlassSurfaceChange()
    }
  }
}

const applyDisplacement = (
  element: HTMLElement,
  filter: SVGFilterElement,
  kind: GlassSurfaceKind,
) => {
  const width = Math.round(element.clientWidth)
  const height = Math.round(element.clientHeight)
  if (!width || !height) return
  const radius = getComputedStyle(element).borderTopLeftRadius
  const corner = radius.endsWith('%')
    ? Math.min(width, height) / 2
    : Number.parseFloat(radius)
  const viewerControl = kind === 'viewer'
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
  const image = filter.querySelector('feImage')
  if (image) image.setAttribute('href', map.href)
  for (const displacement of filter.querySelectorAll('feDisplacementMap')) {
    displacement.setAttribute('scale', String(map.scale))
  }
}

export const bindGlassSurfaces = (root: HTMLElement) => {
  if (root.dataset.glassRefraction !== 'true') return
  const template = root.querySelector('#glass-pill')
  if (!(template instanceof SVGFilterElement) || !template.parentElement) {
    return
  }
  const definitions = template.parentElement
  const records = new Map<
    HTMLElement,
    { filter: SVGFilterElement; kind: GlassSurfaceKind }
  >()
  let nextId = 0
  const resize = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      if (!(target instanceof HTMLElement)) continue
      const bound = records.get(target)
      if (!bound) continue
      applyDisplacement(target, bound.filter, bound.kind)
    }
  })
  const detach = (element: HTMLElement) => {
    const bound = records.get(element)
    if (!bound) return
    resize.unobserve(element)
    element.style.removeProperty('--glass-optics')
    bound.filter.remove()
    records.delete(element)
  }
  const scan = () => {
    const enabled = root.dataset.themePack === 'glass'
    const contained = new Map<HTMLElement, GlassSurfaceKind>()
    if (enabled) {
      for (const surface of registeredSurfaces) {
        if (root.contains(surface.element)) {
          contained.set(surface.element, surface.kind)
        }
      }
    }
    for (const element of records.keys()) {
      if (!contained.has(element)) detach(element)
    }
    if (!enabled) return
    for (const [element, kind] of contained) {
      if (records.has(element)) continue
      const filterNode = template.cloneNode(true)
      if (!(filterNode instanceof SVGFilterElement)) continue
      filterNode.id = `glass-surface-${++nextId}`
      definitions.append(filterNode)
      element.style.setProperty('--glass-optics', `url(#${filterNode.id})`)
      records.set(element, { filter: filterNode, kind })
      resize.observe(element)
      applyDisplacement(element, filterNode, kind)
    }
  }
  const mutations = new MutationObserver(scan)
  mutations.observe(root, {
    attributes: true,
    attributeFilter: ['data-theme-pack'],
  })
  scanListeners.add(scan)
  scan()
  return () => {
    scanListeners.delete(scan)
    mutations.disconnect()
    resize.disconnect()
    for (const element of [...records.keys()]) detach(element)
  }
}
