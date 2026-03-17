import {
  expect,
  userEvent,
  waitFor,
} from 'storybook/test'

import { button, createActor, heading, role } from '../../../.storybook/helpers'
import {
  getLastLogItemByName,
  getLogItems,
  getLogItemsByName,
  parseFrameDetail,
  parseLogItem,
} from '../../testing/admin-log-dom'
import { currentDevtools } from '../../testing/storybook-runtime'

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function getAdminShadowRoot(): ShadowRoot {
  const containerId = currentDevtools?.containerId
  if (!containerId) {
    throw new Error('Current admin devtools instance is missing')
  }

  const host = document.getElementById(containerId)
  if (!(host instanceof HTMLElement) || !host.shadowRoot) {
    throw new Error(`Missing admin shadow root for ${containerId}`)
  }

  return host.shadowRoot
}

function matchesText(value: string, matcher: RegExp | string): boolean {
  return typeof matcher === 'string'
    ? value.includes(matcher)
    : matcher.test(value)
}

function getAdminButton(matcher: RegExp | string): HTMLButtonElement | null {
  return (
    Array.from(getAdminShadowRoot().querySelectorAll('button')).find(
      (candidate): candidate is HTMLButtonElement =>
        candidate instanceof HTMLButtonElement &&
        matchesText(candidate.textContent ?? '', matcher),
    ) ?? null
  )
}

function getAdminSearchInput(): HTMLInputElement {
  const input = getAdminShadowRoot().querySelector('[data-testid="filter-search-input"]')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Admin search input is missing')
  }
  return input
}

function getAdminText(): string {
  return normalizeText(getAdminShadowRoot().textContent ?? '')
}

function expectSubsequence(
  actual: Array<string>,
  expected: Array<string>,
): void {
  let expectedIndex = 0

  for (const actualValue of actual) {
    if (expectedIndex >= expected.length) break
    if (actualValue === expected[expectedIndex]) {
      expectedIndex += 1
    }
  }

  expect(expectedIndex).toBe(expected.length)
}

async function clickAdminButton(matcher: RegExp | string): Promise<void> {
  await waitFor(() => {
    expect(getAdminButton(matcher)).not.toBeNull()
  })

  const targetButton = getAdminButton(matcher)
  if (!targetButton) {
    throw new Error(`Missing admin button ${String(matcher)}`)
  }

  await userEvent.click(targetButton)
}

export const xoAdminActor = createActor().extend((I) => ({
  waitForReady: async () => {
    await I.see(heading(/Tic-Tac-Toe/i).wait())
    await I.see(role('group', 'Tic-tac-toe board'))
    await waitFor(() => {
      expect(getAdminText()).toContain('Reatom Admin')
      expect(getAdminText()).toContain('Start fresh session')
    })
  },
  startFreshSession: async () => {
    await clickAdminButton(/Start fresh session/i)
    await waitFor(() => {
      expect(getLogItems(getAdminShadowRoot())).toHaveLength(0)
    })
  },
  playWinningGame: async () => {
    for (const cellLabel of [
      'Top left cell',
      'Middle left cell',
      'Top center cell',
      'Center cell',
      'Top right cell',
    ]) {
      await I.click(button(cellLabel))
    }
  },
  waitForWinningLogs: async () => {
    await waitFor(() => {
      const shadowRoot = getAdminShadowRoot()
      const moveParams = getLogItemsByName(shadowRoot, 'makeMove').map((item) =>
        parseLogItem(item).content,
      )

      expect(moveParams).toEqual(['[0]', '[3]', '[1]', '[4]', '[2]'])
      expect(getLogItemsByName(shadowRoot, 'board').length).toBeGreaterThan(0)
      expect(getLogItemsByName(shadowRoot, 'winner').length).toBeGreaterThan(0)
      expect(getLogItemsByName(shadowRoot, 'xWins').length).toBeGreaterThan(0)
    })
  },
  pauseCapture: async () => {
    await clickAdminButton(/Pause capture/i)
    await waitFor(() => {
      expect(getAdminText()).toContain('Recording paused')
    })
  },
  seeWinningState: async () => {
    await I.see(heading(/Player X Wins/i).wait())
    await I.see(button(/Play Again/i))
  },
  assertCapturedActivity: async () => {
    const shadowRoot = getAdminShadowRoot()
    const logNames = getLogItems(shadowRoot).map((item) => parseLogItem(item).name)

    expect(getAdminText()).toContain('0 errors')
    expect(logNames).toContain('makeMove')
    expect(logNames).toContain('board')
    expect(logNames).toContain('winner')
    expect(logNames).toContain('xWins')
    expectSubsequence(logNames, [
      'makeMove',
      'board',
      'makeMove',
      'board',
      'makeMove',
      'board',
      'makeMove',
      'board',
      'makeMove',
      'board',
      'winner',
      'xWins',
    ])
  },
  searchLogs: async (query: string) => {
    const searchInput = getAdminSearchInput()
    await userEvent.click(searchInput)
    await userEvent.clear(searchInput)
    if (query.length > 0) {
      await userEvent.type(searchInput, query)
    }
  },
  assertWinnerSearchResults: async () => {
    await waitFor(() => {
      const visibleLogNames = getLogItems(getAdminShadowRoot()).map((item) =>
        parseLogItem(item).name,
      )

      expect(visibleLogNames.length).toBeGreaterThan(0)
      expect(visibleLogNames).toContain('winner')
      expect(visibleLogNames).not.toContain('makeMove')
    })
  },
  openLatestLog: async (name: string) => {
    await waitFor(() => {
      expect(getLastLogItemByName(getAdminShadowRoot(), name)).not.toBeNull()
    })

    const logItem = getLastLogItemByName(getAdminShadowRoot(), name)
    if (!logItem) {
      throw new Error(`Missing admin log item ${name}`)
    }

    await userEvent.click(logItem)
  },
  assertWinnerFrameDetail: async () => {
    await waitFor(() => {
      const detail = parseFrameDetail(getAdminShadowRoot())
      expect(detail).not.toBeNull()
      expect(detail?.atomName).toBe('winner')
      expect(detail?.bodyText).toContain('"X"')
      expect(detail?.causeChainNames.length ?? 0).toBeGreaterThan(0)
      expect(detail?.hasError).toBe(false)
    })
  },
  assertStateExplorer: async () => {
    await waitFor(() => {
      const adminText = getAdminText()
      expect(adminText).toContain('State explorer')
      expect(adminText).toContain('board')
      expect(adminText).toContain('["X","X","X","O","O",null,null,null,null]')
      expect(adminText).toContain('winner')
      expect(adminText).toContain('xWins')
    })
  },
}))
