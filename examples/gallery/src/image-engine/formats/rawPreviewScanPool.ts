import type {
  RawPreviewScanRange,
  RawPreviewScanRequest,
  RawPreviewScanResponse,
} from './rawPreviewScan.types'
import RawPreviewScanWorker from './rawPreviewScan.worker?worker'

type RawPreviewScanJob = {
  buffer: ArrayBuffer
  resolve: (ranges: RawPreviewScanRange[]) => void
  reject: (error: Error) => void
}

type ActiveRawPreviewScanJob = RawPreviewScanJob & {
  id: number
}

const MAX_RAW_PREVIEW_SCAN_WORKERS = Math.max(
  1,
  Math.min(2, (globalThis.navigator?.hardwareConcurrency ?? 4) - 2),
)

const pendingJobs: RawPreviewScanJob[] = []
const idleWorkers: Worker[] = []
const activeJobsByWorker = new Map<Worker, ActiveRawPreviewScanJob>()

let workerCount = 0
let nextRequestId = 1

export function canScanRawPreviewInWorker(): boolean {
  return typeof globalThis.Worker === 'function'
}

export function scanRawPreviewRangesInWorker(
  buffer: ArrayBuffer,
): Promise<RawPreviewScanRange[]> {
  if (!canScanRawPreviewInWorker()) {
    return Promise.reject(new Error('Raw preview workers are not available'))
  }

  return new Promise((resolve, reject) => {
    pendingJobs.push({ buffer, resolve, reject })
    scheduleRawPreviewScanJobs()
  })
}

function scheduleRawPreviewScanJobs(): void {
  while (pendingJobs.length > 0) {
    const worker = takeRawPreviewScanWorker()
    if (!worker) return

    const job = pendingJobs.shift()
    if (!job) return

    const id = nextRequestId++
    const request: RawPreviewScanRequest = { id, buffer: job.buffer }
    activeJobsByWorker.set(worker, { ...job, id })

    try {
      worker.postMessage(request, [job.buffer])
    } catch (error) {
      activeJobsByWorker.delete(worker)
      terminateRawPreviewScanWorker(worker)
      job.reject(error instanceof Error ? error : new Error(String(error)))
      scheduleRawPreviewScanJobs()
    }
  }
}

function takeRawPreviewScanWorker(): Worker | null {
  const worker = idleWorkers.pop()
  if (worker) return worker

  if (workerCount >= MAX_RAW_PREVIEW_SCAN_WORKERS) return null

  return createRawPreviewScanWorker()
}

function createRawPreviewScanWorker(): Worker {
  const worker = new RawPreviewScanWorker()
  workerCount++

  worker.addEventListener(
    'message',
    (event: MessageEvent<RawPreviewScanResponse>) => {
      handleRawPreviewScanMessage(worker, event.data)
    },
  )
  worker.addEventListener('error', (event) => {
    handleRawPreviewScanError(worker, event)
  })

  return worker
}

function handleRawPreviewScanMessage(
  worker: Worker,
  response: RawPreviewScanResponse,
): void {
  const job = activeJobsByWorker.get(worker)
  if (!job || job.id !== response.id) return

  activeJobsByWorker.delete(worker)
  idleWorkers.push(worker)

  if ('error' in response) {
    job.reject(new Error(response.error))
  } else {
    job.resolve(response.ranges)
  }

  scheduleRawPreviewScanJobs()
}

function handleRawPreviewScanError(worker: Worker, event: ErrorEvent): void {
  const job = activeJobsByWorker.get(worker)
  activeJobsByWorker.delete(worker)
  terminateRawPreviewScanWorker(worker)

  if (job) {
    job.reject(new Error(event.message || 'Raw preview worker failed'))
  }

  scheduleRawPreviewScanJobs()
}

function terminateRawPreviewScanWorker(worker: Worker): void {
  const idleIndex = idleWorkers.indexOf(worker)
  if (idleIndex >= 0) idleWorkers.splice(idleIndex, 1)

  worker.terminate()
  workerCount--
}

const shutdownError = new Error('Raw preview scan pool shut down')

export function shutdownRawPreviewScanPool(): void {
  while (pendingJobs.length > 0) {
    const job = pendingJobs.shift()
    job?.reject(shutdownError)
  }

  for (const worker of [...idleWorkers]) {
    terminateRawPreviewScanWorker(worker)
  }

  for (const [worker, job] of activeJobsByWorker) {
    job.reject(shutdownError)
    terminateRawPreviewScanWorker(worker)
  }

  activeJobsByWorker.clear()
}
