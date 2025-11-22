import { type Action, action, type Atom, atom, type AtomLike, named, ReatomError, top } from "../core"
import { addChangeHook } from "../extensions"
import { wrap } from "../methods"
import { type BooleanAtom, reatomBoolean } from "../primitives"
import { MAX_SAFE_TIMEOUT, noop, sleep } from "../utils"

/** contains the ms remaining to the end of the timer. */
export interface TimerAtom extends AtomLike<number> {
	/** from 0 to 1, `(delay - remains) / delay` */
	progress: AtomLike<number>
	/** interval in ms */
	interval: Atom<number> & {
		/** @deprecated extra thing */
		setSeconds: Action<[seconds: number], number>
	}
	/** start timer by passed interval. Seconds expected with default `delayMultiplier` */
	start: Action<[delay: number, passed?: number], Promise<void>>
	/** stop timer manually */
	stop: Action<[], void>
	/** allow to pause timer */
	paused: BooleanAtom
	/** switch pause state */
	pause: Action<[], boolean>
	/** track end of timer. Do not call manually! */
	onEnd: Action<[], void>
}

export const reatomTimer = (
	options:
		| string
		| {
			name?: string
			/** interval in milliseconds
			 * @default 1000
			 */
			interval?: number
			/** startTimer passed delay multiplier
			 * @default 1000 - allow to pass seconds to `startTimer`
			 */
			delayMultiplier?: number
			/** progressAtom precision
			 * @default 2
			 */
			progressPrecision?: number
			/** reset progressAtom to 0 on `stopTimer`
			 * @default true
			 */
			resetProgress?: boolean
		} = {},
): TimerAtom => {
	const {
		name = named('timerAtom'),
		interval = 1000,
		delayMultiplier = 1000,
		progressPrecision = 2,
		resetProgress = true,
	} = typeof options === 'string' ? { name: options } : options
	const timerAtom = atom(0, name)

	const progressAtom /* : TimerAtom['progressAtom'] */ = atom(
		0,
		`${name}.progress`,
	)

	const paused: TimerAtom['paused'] = reatomBoolean(false, `${name}.paused`)

	const intervalAtom: TimerAtom['interval'] = atom(
		interval,
		`${name}.interval`,
	).actions(target => ({
		setSeconds: (seconds: number) => target.set(seconds * 1000),
	}))

	const _versionAtom = atom(0, `${name}._versionAtom`)

	const start: TimerAtom['start'] = action(
		(delay: number, passed = 0) => {
			delay *= delayMultiplier

			delay = Math.min(MAX_SAFE_TIMEOUT, delay)

			if (delay < intervalAtom())
				throw new ReatomError('interval less than delay')

			if (delay < passed)
				throw new ReatomError('passed more than delay')

			const version = _versionAtom.set((s) => s + 1)
			const start = Date.now()
			let target = delay + start - passed
			let remains = delay - passed
			let resolvePause = noop
			let pauseFrom = 0

			timerAtom.set(remains)

			progressAtom.set(passed / delay)

			paused.set(false)

			const startTimerRoot = top().root;

			const cleanupPause = addChangeHook(paused, (pause) => {
				if (startTimerRoot === top().root) {
					const now = Date.now()

					if (pause) {
						pauseFrom = now
					} else {
						target += now - pauseFrom
						resolvePause()
						resolvePause = noop
						pauseFrom = 0
					}
				}
			})

			return wrap((async () => {
				while (true) {
					remains = target - Date.now()
					if (remains <= 0) break

					let interval = intervalAtom()
					const tickDelay =
						remains < interval
							? remains
							: // reduce perf overload shift (when the sleep resolves after expected time)
							remains % interval || interval

					await wrap(sleep(tickDelay))

					if (pauseFrom) {
						await wrap(new Promise((r) => (resolvePause = r)))
						continue
					}

					if (version !== _versionAtom()) return

					remains = timerAtom.set(Math.max(0, target - Date.now()))
					interval = intervalAtom()
					const steps = Math.ceil(delay / interval)
					const stepsRemains = Math.ceil(remains / interval)
					progressAtom.set(+(1 - stepsRemains / steps).toFixed(progressPrecision))
				}
			})())
				.finally(wrap(() => {
					cleanupPause()
					if (version === _versionAtom()) onEnd()
				}))
		},
		`${name}.start`,
	)

	const stop: TimerAtom['stop'] = action(() => {
		_versionAtom.set((s) => s + 1)
		onEnd()
		if (resetProgress) progressAtom.set(0)
	}, `${name}.stop`)

	const onEnd: TimerAtom['onEnd'] = action(() => {
		timerAtom.set(0)
	}, `${name}.onEnd`)

	const pause: TimerAtom['pause'] = action(
		() => paused.toggle(),
		`${name}.pause`,
	)

	return Object.assign({}, timerAtom, {
		progress: progressAtom,
		onEnd,
		interval: intervalAtom,
		start,
		stop,
		paused,
		pause,
	})
}