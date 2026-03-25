import { effect } from '@reatom/core'

import { eqEnabled, equalizerBands, getEqualizerGains } from './equalizer'

type AudioGraph = {
  context: AudioContext
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode
  filters: BiquadFilterNode[]
  output: GainNode
}

let audioGraph: AudioGraph | null = null

function createFilters(context: AudioContext) {
  return equalizerBands.map((band) => {
    const filter = context.createBiquadFilter()
    filter.type = band.type
    filter.frequency.value = band.frequency
    filter.Q.value = band.q
    filter.gain.value = 0
    return filter
  })
}

function connectFilters(
  source: MediaElementAudioSourceNode,
  filters: readonly BiquadFilterNode[],
  output: GainNode,
) {
  let currentNode: AudioNode = source

  for (const filter of filters) {
    currentNode.connect(filter)
    currentNode = filter
  }

  currentNode.connect(output)
  output.connect(source.context.destination)
}

function disconnectGraph(graph: AudioGraph) {
  graph.source.disconnect()

  for (const filter of graph.filters) {
    filter.disconnect()
  }

  graph.output.disconnect()
}

function syncAudioGraph() {
  if (!audioGraph) {
    return
  }

  const gains = getEqualizerGains()
  const enabled = eqEnabled()
  const time = audioGraph.context.currentTime

  audioGraph.filters.forEach((filter, index) => {
    const nextGain = enabled ? (gains[index] ?? 0) : 0
    filter.gain.cancelScheduledValues(time)
    filter.gain.setValueAtTime(filter.gain.value, time)
    filter.gain.linearRampToValueAtTime(nextGain, time + 0.04)
  })
}

export function ensureAudioGraph(element: HTMLAudioElement) {
  if (audioGraph?.element === element) {
    syncAudioGraph()
    return
  }

  const context = audioGraph?.context ?? new AudioContext()

  if (audioGraph) {
    disconnectGraph(audioGraph)
  }

  const source = context.createMediaElementSource(element)
  const filters = createFilters(context)
  const output = context.createGain()

  connectFilters(source, filters, output)

  audioGraph = {
    context,
    element,
    source,
    filters,
    output,
  }

  syncAudioGraph()
}

export async function resumeAudioGraph() {
  if (!audioGraph) {
    return
  }

  if (audioGraph.context.state === 'running') {
    return
  }

  try {
    await audioGraph.context.resume()
  } catch {
    // ignore
  }
}

effect(() => {
  eqEnabled()
  getEqualizerGains()
  syncAudioGraph()
}, 'syncAudioGraph')
