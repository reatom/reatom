import { subscribe, test } from 'test'
import { describe, expect } from 'vitest'

import { wrap } from '../methods'
import { sleep } from '../utils'
import { reatomTimer } from './reatomTimer'

const getDuration = async (cb: () => Promise<void>) => {
	const start = Date.now()
	await cb()
	return Date.now() - start
}

describe('timer', { retry: 3 }, () => {
	test(`base API`, async () => {
		const timerAtom = reatomTimer(`test`)

		timerAtom.interval.setSeconds(0.001)

		var target = 50
		var duration = await wrap(getDuration(() =>
			timerAtom.start(target / 1000),
		))

		expect(duration).toBeGreaterThanOrEqual(target)

		var target = 50
		var [duration] = await wrap(Promise.all([
			getDuration(() => timerAtom.start(target / 1000)),
			sleep(target / 2).then(wrap(() => timerAtom.stop())),
		]))
		expect(duration).toBeGreaterThanOrEqual(target / 2)
		expect(duration).lessThan(target)
	})

	test('progress atom', async () => {
		const timerAtom = reatomTimer({ delayMultiplier: 1 })

		timerAtom.interval.set(10)
		const track = subscribe(timerAtom.progress)

		await wrap(timerAtom.start(50))
		expect(track.mock.calls.flat()).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
	})

	test('paused atom', async () => {
		const timerAtom = reatomTimer({ interval: 10, delayMultiplier: 1 })

		const track = subscribe(timerAtom.progress)
		track.mockReset()

		timerAtom.start(100)
		let target = Date.now() + 100

		for (let i = 0; i < 5; i++) {
			await wrap(sleep(5))
		}

		expect(track.mock.calls.flat()).toEqual([0.1, 0.2])

		timerAtom.paused.set(true)
		await wrap(sleep(25))
		target += 25
		expect(track.mock.calls.flat()).toEqual([0.1, 0.2])

		timerAtom.paused.set(false)
		await wrap(sleep(10))
		expect(track.mock.calls.flat()).toEqual([0.1, 0.2, 0.3])

		await wrap(sleep(target - Date.now() - 5))
		expect(track.mock.calls.flat()).toEqual([
			0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
		])

		await wrap(sleep(10))
		expect(track.mock.calls.flat()).toEqual([
			0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
		])
	})

	test('do not allow over progress', async () => {
		const timerAtom = reatomTimer({ delayMultiplier: 1, interval: 1 })

		const delay = 10
		const start = Date.now()
		const promise = timerAtom.start(delay)

		await wrap(sleep(delay / 2))
		while (Date.now() - start < delay) { ; }

		await wrap(promise)

		expect(timerAtom.progress()).toBe(1)
	})

	test('allow start from passed time', async () => {
		const timerAtom = reatomTimer({ delayMultiplier: 1, interval: 1 })

		const delay = 20
		const passed = 10
		const start = Date.now()
		const promise = timerAtom.start(delay, passed)
		expect(timerAtom.progress()).toBe(passed / delay)

		await wrap(promise)

		const duration = Date.now() - start
		expect(Math.abs(delay - passed - duration)).toBeLessThanOrEqual(2)
	})
})