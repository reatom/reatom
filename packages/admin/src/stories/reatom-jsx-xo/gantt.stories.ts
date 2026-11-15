import type { Meta, StoryObj } from '@storybook/html'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { button, createActor, heading, role } from '../../../.storybook/helpers'
import {
  ADMIN_GANTT_OVERSCAN,
  ADMIN_GANTT_ROW_HEIGHT as ROW_HEIGHT,
} from '../../gantt'
import { getAdminRoot } from '../../testing/admin-root'
import { matchAdminScreenshot } from '../../testing/visual'
import { githubStars } from './mocks/handlers'
import { renderXoGantt } from './gantt-boot'

const I = createActor()

const winningMoveLabels = [
  'Top left cell',
  'Middle left cell',
  'Top center cell',
  'Center cell',
  'Top right cell',
] as const

const meta = {
  title: 'Integration/XO Gantt',
  render: () => renderXoGantt('wide'),
  parameters: { layout: 'fullscreen' },
  beforeEach: (context) => void I.init(context),
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function adminUi() {
  return within(getAdminRoot())
}

async function boot(canvas: HTMLElement) {
  await waitFor(() => {
    const root = canvas.querySelector('[data-testid="xo-story-root"]')
    expect(root).toBeInstanceOf(HTMLElement)
    const element = root as HTMLElement
    expect(element.dataset.ready, element.dataset.error ?? 'boot failed').toBe(
      '1',
    )
  })
  await I.see(heading(/Tic-Tac-Toe/i).wait())
  const story = canvas.querySelector('[data-ready="1"]')
  if (story instanceof HTMLElement) {
    const playAgain = [...story.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Play Again'),
    )
    if (playAgain) await userEvent.click(playAgain)
    const versusComputer = [...story.querySelectorAll('label')].find((item) =>
      item.textContent?.includes('vs AI'),
    )
    if (versusComputer) await userEvent.click(versusComputer)
  }
}

async function playWinningGame(canvas: HTMLElement) {
  const story = canvas.querySelector('[data-ready="1"]')
  if (!(story instanceof HTMLElement)) throw new Error('XO story root missing')
  for (const label of winningMoveLabels) {
    const cell = story.querySelector(`button[aria-label="${label}"]`)
    if (!(cell instanceof HTMLButtonElement)) {
      throw new Error(`Missing ${label}`)
    }
    cell.click()
  }
  await waitFor(() => {
    expect(story.textContent).toMatch(/Player X Wins|Wins!/)
  })
}

async function clickRow(name: string | RegExp) {
  await waitFor(() => {
    expect(adminUi().getAllByRole('row', { name }).length).toBeGreaterThan(0)
  })
  const rows = adminUi().getAllByRole('row', { name })
  const row = rows[0]
  if (!row) throw new Error('Missing timeline row')
  row.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true }),
  )
  return row
}

function pressAdmin(key: string, init: KeyboardEventInit = {}) {
  const root = getAdminRoot()
  const dialog = root.querySelector('[role="dialog"]')
  const workspace = root.querySelector('[data-reatom-name="DebuggerWorkspace"]')
  const target =
    key === 'Escape' && dialog instanceof HTMLElement
      ? dialog
      : key === 'Escape' && workspace instanceof HTMLElement
        ? workspace
        : root
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  )
}

function selectedLabel(): string {
  return (
    getAdminRoot()
      .querySelector('[role="row"][aria-selected="true"]')
      ?.getAttribute('aria-label') ?? ''
  )
}

function rowLabels(): string[] {
  return [...getAdminRoot().querySelectorAll('[role="row"]')].flatMap((row) => {
    const label = row.getAttribute('aria-label')
    return label ? [label] : []
  })
}

function timelineRowCount(): number {
  const count = getAdminRoot()
    .querySelector('[role="treegrid"]')
    ?.getAttribute('aria-rowcount')
  return Number(count ?? 0)
}

export const WinningGameTimeline: Story = {
  name: 'Winning game timeline',
  tags: ['@smoke'],
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await playWinningGame(canvasElement)
    const adminShadow = getAdminRoot().getRootNode()
    if (!(adminShadow instanceof ShadowRoot)) {
      throw new Error('Admin shadow root missing')
    }
    const hostBox = adminShadow.host.getBoundingClientRect()
    expect(
      document.elementFromPoint(
        hostBox.left + hostBox.width / 2,
        hostBox.top + Math.min(hostBox.height, window.innerHeight) / 2,
      ),
    ).toBe(adminShadow.host)
    await userEvent.click(adminUi().getByRole('button', { name: 'Expand all' }))
    await waitFor(() => {
      const text = getAdminRoot().textContent ?? ''
      expect(text).toContain('makeMove')
      expect(text).toContain('board')
      expect(text).toMatch(/\d+ms|\ds/)
    })
    const scroller = getAdminRoot().querySelector(
      '[data-testid="gantt-scroller"]',
    )
    if (!(scroller instanceof HTMLElement)) throw new Error('Scroller missing')
    await waitFor(() => {
      expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
    })
    scroller.scrollTop = 0
    await waitFor(() => {
      expect(getAdminRoot().textContent).toContain('winner')
    })
    expect(document.scrollingElement?.scrollTop ?? 0).toBe(0)
    scroller.scrollTop = scroller.scrollHeight
    await clickRow('makeMove')
    await waitFor(() => {
      expect(selectedLabel()).toBe('makeMove')
    })
  },
}

function nextFrames() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function mountedRows(): Array<HTMLElement> {
  return [
    ...getAdminRoot().querySelectorAll<HTMLElement>(
      '[data-testid="gantt-row"]',
    ),
  ]
}

async function scrollTimeline(scroller: HTMLElement, scrollTop: number) {
  // Stop scheduled follow-to-tail writes before exercising native scrolling.
  const pause = adminUi().queryByRole('button', { name: 'Pause', exact: true })
  if (pause) await userEvent.click(pause)
  await nextFrames()
  scroller.scrollTop = scrollTop
  scroller.dispatchEvent(new Event('scroll'))
  await nextFrames()
  expect(scroller.scrollTop).toBe(scrollTop)
}

export const ScrollKeepsRowsMounted: Story = {
  name: 'Scroll keeps rows mounted',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await playWinningGame(canvasElement)
    const scroller = getAdminRoot().querySelector(
      '[data-testid="gantt-scroller"]',
    )
    if (!(scroller instanceof HTMLElement)) throw new Error('Scroller missing')
    const rowsPastOverscan = ADMIN_GANTT_OVERSCAN + 1
    await waitFor(() => {
      adminUi().getByRole('button', { name: 'Expand all' }).click()
      expect(scroller.scrollHeight).toBeGreaterThan(
        scroller.clientHeight + ROW_HEIGHT * (rowsPastOverscan + 1),
      )
    })
    await scrollTimeline(scroller, 0)

    const initialRows = mountedRows()
    expect(initialRows.length).toBeGreaterThan(2)
    const middleRow = initialRows[Math.floor(initialRows.length / 2)]!

    await scrollTimeline(scroller, 1)
    const rowsAfterPixel = mountedRows()
    expect(rowsAfterPixel[Math.floor(rowsAfterPixel.length / 2)]).toBe(
      middleRow,
    )
    expect(rowsAfterPixel.length).toBe(initialRows.length)
    expect(
      rowsAfterPixel.every((row, index) => row === initialRows[index]),
    ).toBe(true)

    await scrollTimeline(scroller, ROW_HEIGHT * rowsPastOverscan)
    const rowsAfterOverscan = mountedRows()
    expect(middleRow.isConnected).toBe(true)
    expect(initialRows[0]!.isConnected).toBe(false)
    const keptRows = initialRows.slice(1)
    expect(
      keptRows.every((row, index) => row === rowsAfterOverscan[index]),
    ).toBe(true)
    expect(initialRows.includes(rowsAfterOverscan.at(-1)!)).toBe(false)
  },
}

export const InspectingARowKeepsScroll: Story = {
  name: 'Inspecting a row keeps the selected row in view',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await playWinningGame(canvasElement)
    const scroller = getAdminRoot().querySelector(
      '[data-testid="gantt-scroller"]',
    )
    if (!(scroller instanceof HTMLElement)) throw new Error('Scroller missing')
    const rowsPastOverscan = ADMIN_GANTT_OVERSCAN + 4
    await waitFor(() => {
      adminUi().getByRole('button', { name: 'Expand all' }).click()
      expect(scroller.scrollHeight).toBeGreaterThan(
        scroller.clientHeight + ROW_HEIGHT * (rowsPastOverscan + 1),
      )
    })
    const scrollTop = ROW_HEIGHT * rowsPastOverscan
    await scrollTimeline(scroller, scrollTop)

    const scrollerBox = scroller.getBoundingClientRect()
    const visibleRows = mountedRows().filter((row) => {
      const box = row.getBoundingClientRect()
      return box.bottom > scrollerBox.top && box.top < scrollerBox.bottom
    })
    const target = visibleRows[Math.floor(visibleRows.length / 2)]
    if (!target) throw new Error('No visible timeline row')
    const label = target.getAttribute('aria-label')
    if (!label) throw new Error('Visible row has no name')
    target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    )

    await waitFor(() => {
      expect(adminUi().getByRole('heading', { name: label })).toBeTruthy()
    })
    await nextFrames()

    const spacer = scroller.querySelector('[data-testid="gantt-spacer-before"]')
    const spacerHeight = spacer instanceof HTMLElement ? spacer.offsetHeight : 0
    expect(scroller.scrollTop).toBeGreaterThan(0)
    expect(scroller.scrollTop).toBeGreaterThanOrEqual(
      spacerHeight - ROW_HEIGHT * (ADMIN_GANTT_OVERSCAN + 1),
    )
    expect(Math.abs(scroller.scrollTop - scrollTop)).toBeLessThan(
      ROW_HEIGHT * 3,
    )

    const selected = scroller.querySelector('[aria-selected="true"]')
    if (!(selected instanceof HTMLElement)) {
      throw new Error('Selected row is not mounted')
    }
    const selectedBox = selected.getBoundingClientRect()
    const view = scroller.getBoundingClientRect()
    expect(selectedBox.bottom).toBeGreaterThan(view.top)
    expect(selectedBox.top).toBeLessThan(view.bottom)
  },
}

export const WaterfallRootShowsSpanCount: Story = {
  name: 'Waterfall roots show a span count away from the duration',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await playWinningGame(canvasElement)
    await userEvent.click(adminUi().getByRole('button', { name: 'Expand all' }))
    const scroller = getAdminRoot().querySelector<HTMLElement>(
      '[data-testid="gantt-scroller"]',
    )!
    await scrollTimeline(scroller, 0)
    const badge = await waitFor(() => {
      const found = getAdminRoot().querySelector(
        '[data-testid="gantt-span-count"]',
      )
      expect(found?.textContent).toMatch(/\d+ spans/)
      return found as HTMLElement
    })
    const row = badge.closest('[role="row"]')
    const label = row?.querySelector('[data-testid="gantt-row-label"]')
    const duration = row?.querySelector('[data-gantt-duration]')
    expect(label?.contains(badge)).toBe(false)
    expect(badge.textContent).toMatch(/^\d+ spans$/)
    expect(badge.textContent).not.toMatch(/\d+ms|\d+s/)
    expect(duration?.textContent ?? '').toMatch(/\d/)

    await userEvent.click(adminUi().getByRole('button', { name: 'Log' }))
    await waitFor(() => {
      expect(
        getAdminRoot().querySelector('[data-testid="gantt-span-count"]'),
      ).toBeNull()
    })
  },
}

export const InspectAMove: Story = {
  name: 'Inspect a move',
  tags: ['@smoke'],
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await playWinningGame(canvasElement)
    await clickRow('makeMove')
    await waitFor(() => {
      expect(adminUi().getByRole('heading', { name: 'makeMove' })).toBeTruthy()
    })
    const card = adminUi().getByRole('complementary', { name: 'Frame' })
    expect(within(card).queryByRole('tab', { name: 'Payload' })).toBeNull()
    expect(within(card).queryByRole('tab', { name: 'Params' })).toBeNull()
    expect(card.textContent ?? '').not.toMatch(
      /\b(Attributes|Causes|Effects|Resource|Payload|Params)\b/,
    )
    await waitFor(() => {
      expect(card.textContent).toContain('Param')
      expect(card.textContent).not.toContain('Array(')
    })
    await userEvent.click(adminUi().getByRole('button', { name: 'Expand all' }))
    await clickRow('board')
    await waitFor(() => {
      expect(within(card).queryByRole('tab', { name: 'State' })).toBeNull()
      expect(card.querySelector('[data-inspector-key="0"]')).toBeInstanceOf(
        HTMLElement,
      )
    })
    await userEvent.click(
      within(card).getByRole('tab', { name: 'Cause Chain' }),
    )
    const openInGraph = await waitFor(() =>
      within(card).getByRole('button', { name: 'Open in Graph' }),
    )
    await userEvent.click(openInGraph)
    await waitFor(() => {
      expect(
        adminUi()
          .getByRole('tab', { name: 'Graph' })
          .getAttribute('aria-selected'),
      ).toBe('true')
    })
    expect(adminUi().getByRole('heading', { name: 'Graph' })).toBeTruthy()
  },
}

export const KeyboardNavigation: Story = {
  name: 'Keyboard navigation',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await I.click(button('Top left cell'))
    await clickRow(/makeMove|board|winner|xWins/)
    const first = selectedLabel()
    expect(first).not.toBe('')
    pressAdmin('j')
    await waitFor(() => {
      expect(selectedLabel()).not.toBe('')
    })
    pressAdmin('ArrowRight')
    pressAdmin('ArrowLeft')
    pressAdmin('Enter')
    await waitFor(() => {
      const opened = selectedLabel()
      expect(opened).not.toBe('')
      expect(adminUi().getByRole('heading', { name: opened })).toBeTruthy()
    })
    pressAdmin('/')
    const search = adminUi().getByRole('searchbox', { name: 'Name' })
    await waitFor(() => {
      const root = search.getRootNode()
      const active =
        root instanceof ShadowRoot ? root.activeElement : document.activeElement
      expect(active).toBe(search)
    })
    search.blur()
    getAdminRoot().focus()
    pressAdmin('?')
    await waitFor(() => {
      expect(adminUi().getByRole('dialog', { name: 'Help' })).toBeTruthy()
    })
    expect(adminUi().getByText(/name:makeMove/)).toBeTruthy()
    pressAdmin('ArrowLeft', { altKey: true })
  },
}

export const ModeSwitchKeepsSelection: Story = {
  name: 'Mode switch keeps selection',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await playWinningGame(canvasElement)
    const nameSearch = adminUi().getByRole('searchbox', {
      name: 'Name',
    }) as HTMLInputElement
    nameSearch.value = 'winner'
    nameSearch.dispatchEvent(new Event('input', { bubbles: true }))
    await clickRow('winner')
    const selected = selectedLabel()
    expect(selected).toBe('winner')
    await userEvent.click(adminUi().getByRole('button', { name: 'Log' }))
    await waitFor(() => {
      expect(selectedLabel()).toBe('winner')
    })
    await userEvent.click(adminUi().getByRole('tab', { name: 'State' }))
    await waitFor(() => {
      // State uses the same name filter as Timeline. Check the State tree,
      // rather than the selected frame heading shared by both views.
      expect(
        getAdminRoot().querySelector(
          '[data-testid="otlp-state-tree"] [data-inspector-key="winner"]',
        ),
      ).not.toBeNull()
    })
    await userEvent.click(adminUi().getByRole('tab', { name: 'Timeline' }))
    await waitFor(() => {
      expect(selectedLabel()).toBe('winner')
    })
  },
}

export const StateInspectorOpensAtom: Story = {
  name: 'State inspector opens an atom in the Gantt',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await playWinningGame(canvasElement)
    await userEvent.click(adminUi().getByRole('tab', { name: 'State' }))
    const board = await waitFor(() => {
      const field = getAdminRoot().querySelector(
        '[data-testid="otlp-state-tree"] [data-inspector-key="board"]',
      )
      expect(field).toBeInstanceOf(HTMLElement)
      // Capture delivery runs on a later animation frame than the game UI.
      expect(field?.textContent).toContain('"X"')
      return field as HTMLElement
    })
    expect(board.querySelector('[data-inspector-key="0"]')).toBeNull()
    const expandBoard = within(board).getByRole('button', { expanded: false })
    expect(expandBoard.getAttribute('aria-label')).toBeNull()
    expect(expandBoard.textContent).toContain('[')
    await userEvent.click(expandBoard)
    await waitFor(() => {
      expect(board.querySelector('[data-inspector-key="0"]')).toBeInstanceOf(
        HTMLElement,
      )
    })
    const moreButtons = [...board.querySelectorAll('button')].filter((node) =>
      node.textContent?.includes('… more'),
    )
    expect(
      moreButtons.filter((node) => getComputedStyle(node).display !== 'none'),
    ).toHaveLength(0)
    await userEvent.click(
      within(board).getByRole('button', {
        name: 'Show board on the timeline',
      }),
    )
    await waitFor(() => {
      expect(
        adminUi()
          .getByRole('tab', { name: 'Timeline' })
          .getAttribute('aria-selected'),
      ).toBe('true')
      expect(selectedLabel()).toBe('board')
    })
  },
}

export const NameSearchFiltersRows: Story = {
  name: 'Name search filters rows',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await I.click(button('Top left cell'))
    await userEvent.click(adminUi().getByRole('button', { name: 'Expand all' }))
    await waitFor(() => {
      const names = rowLabels()
      // The action can already be above the virtual window while following.
      expect(names.length).toBeGreaterThan(0)
      expect(names.some((name) => name !== 'makeMove')).toBe(true)
    })
    const beforeCount = timelineRowCount()
    const nameSearch = adminUi().getByRole('searchbox', {
      name: 'Name',
    }) as HTMLInputElement
    await userEvent.type(nameSearch, 'makeMove')
    await waitFor(() => {
      const names = rowLabels()
      expect(names.length).toBeGreaterThan(0)
      expect(names.every((name) => name === 'makeMove')).toBe(true)
      expect(timelineRowCount()).toBeLessThan(beforeCount)
    })
    const clearedSearch = adminUi().getByRole('searchbox', {
      name: 'Name',
    }) as HTMLInputElement
    clearedSearch.value = ''
    clearedSearch.dispatchEvent(new Event('input', { bubbles: true }))
    await waitFor(() => {
      const names = rowLabels()
      // Following may place makeMove above the mounted window again.
      expect(names.some((name) => name !== 'makeMove')).toBe(true)
      expect(timelineRowCount()).toBeGreaterThan(
        names.filter((name) => name === 'makeMove').length,
      )
    })
  },
}

export const FilterCalculatorNarrowsRows: Story = {
  name: 'Filter calculator narrows rows',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await I.click(button('Top left cell'))
    await waitFor(() => {
      expect(rowLabels()).toContain('resetGame')
    })

    await userEvent.click(
      adminUi().getByRole('button', { name: 'Advanced filters' }),
    )
    await waitFor(() =>
      expect(
        adminUi().getByRole('dialog', { name: 'Advanced filters' }),
      ).toBeVisible(),
    )

    const keys = within(
      adminUi().getByRole('group', { name: 'Calculator keys' }),
    )
    expect(keys.getByRole('button', { name: 'Insert AND' })).toHaveProperty(
      'disabled',
      true,
    )
    await userEvent.click(keys.getByRole('button', { name: 'Insert name' }))
    await userEvent.click(
      keys.getByRole('button', { name: 'Insert contains (:)' }),
    )
    const expression = adminUi().getByRole('textbox', {
      name: 'Filter expression',
    }) as HTMLInputElement
    await userEvent.type(expression, 'makeMove')
    await userEvent.click(keys.getByRole('button', { name: 'Insert OR' }))
    await userEvent.click(keys.getByRole('button', { name: 'Insert kind' }))
    await userEvent.click(
      keys.getByRole('button', { name: 'Insert equals (=)' }),
    )
    await userEvent.click(
      await keys.findByRole('button', { name: 'Insert atom' }),
    )

    expect(expression.value).toBe('name:makeMove OR kind=atom')
    await waitFor(() => {
      expect(adminUi().getByText(/= \d+ of \d+ records match/)).toBeTruthy()
      expect(adminUi().getByText('Not applied. Enter or Apply.')).toBeTruthy()
    })
    const breakdown = adminUi().getByRole('region', {
      name: 'Expression breakdown',
    })
    expect(within(breakdown).getByText('OR · any of')).toBeTruthy()
    expect(within(breakdown).getByText('name:makeMove')).toBeTruthy()
    expect(within(breakdown).getByText('kind=atom')).toBeTruthy()

    await userEvent.click(
      adminUi().getByRole('button', { name: 'Apply expression' }),
    )
    await waitFor(() => {
      const names = rowLabels()
      expect(names).toContain('makeMove')
      expect(names).not.toContain('resetGame')
    })
    expect(
      adminUi().getByRole('dialog', { name: 'Advanced filters' }),
    ).toBeVisible()

    await userEvent.click(
      adminUi().getByRole('button', {
        name: 'Remove applied expression name:makeMove OR kind=atom',
      }),
    )
    await waitFor(() => {
      expect(rowLabels()).toContain('resetGame')
    })
  },
}

export const PauseAndResume: Story = {
  name: 'Pause and resume',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await userEvent.click(adminUi().getByRole('button', { name: 'Pause' }))
    await waitFor(() => {
      expect(getAdminRoot().textContent).toContain('Paused')
    })
    await I.click(button('Top left cell'))
    await waitFor(() => {
      expect(getAdminRoot().textContent).toMatch(/\d+ waiting/)
    })
    await userEvent.click(adminUi().getByRole('button', { name: 'Resume' }))
    await waitFor(() => {
      expect(getAdminRoot().textContent).toContain('Capturing')
      expect(getAdminRoot().textContent).toContain('makeMove')
    })
  },
}

export const ClearAndUndo: Story = {
  name: 'Clear and undo',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await I.click(button('Top left cell'))
    await clickRow('makeMove')
    await userEvent.click(adminUi().getByRole('button', { name: 'Clear' }))
    await waitFor(() => {
      expect(adminUi().getByText('Records cleared')).toBeTruthy()
      expect(adminUi().getByRole('button', { name: 'Undo' })).toBeTruthy()
    })
    await userEvent.click(adminUi().getByRole('button', { name: 'Undo' }))
    // Find the restored event through the public filter: it may be offscreen.
    await userEvent.type(
      adminUi().getByRole('searchbox', { name: 'Name' }),
      'makeMove',
    )
    await waitFor(() => {
      expect(
        adminUi().getAllByRole('row', { name: 'makeMove' }).length,
      ).toBeGreaterThan(0)
    })
  },
}

export const GithubStarsFailure: Story = {
  name: 'GitHub stars failure',
  parameters: {
    msw: { handlers: { githubStars: githubStars.error } },
  },
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    const footer = await import('./src/components/Footer')
    await footer.repositoryStarCountResource.retry().catch(() => undefined)
    await waitFor(() => {
      expect(getAdminRoot().textContent).toMatch(/Service Unavailable|error/i)
    })
    await userEvent.click(adminUi().getByRole('button', { name: 'Errors' }))
    adminUi().getByRole('button', { name: 'Expand all' }).click()
    await clickRow(/repositoryStarCount|Service Unavailable/)
    const card = adminUi().getByRole('complementary', { name: 'Frame' })
    expect(within(card).getByRole('alert').textContent).toMatch(
      /Service Unavailable|error/i,
    )
  },
}

export const ComputerMoveInProgress: Story = {
  name: 'Computer move in progress',
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await I.click(role('checkbox', /2 Players/i))
    await I.click(button('Top left cell'))
    await waitFor(() => {
      expect(getAdminRoot().textContent).toMatch(/computerMove|In progress/)
    })
  },
}

export const EmptyLiveSession: Story = {
  name: 'Empty live session',
  render: () => renderXoGantt('empty'),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const root = canvasElement.querySelector('[data-testid="xo-story-root"]')
      expect((root as HTMLElement).dataset.ready).toBe('1')
    })
    await waitFor(() => {
      const text = getAdminRoot().textContent ?? ''
      expect(text).toContain('No records yet')
      expect(text).toContain('skipGlobalExtension')
      expect(text).toContain('OpenTelemetry setup')
    })
    expect(
      adminUi().getByRole('link', { name: 'OpenTelemetry setup' }),
    ).toBeTruthy()
  },
}

export const NarrowDrawer: Story = {
  name: 'Narrow drawer',
  globals: { viewport: { value: 'narrow', isRotated: false } },
  render: () => renderXoGantt('narrow'),
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    await clickRow(/makeMove|resetGame|footer/)
    await waitFor(() => {
      expect(adminUi().getByRole('dialog', { name: 'Frame' })).toBeTruthy()
    })
    pressAdmin('Escape')
    await waitFor(() => {
      expect(adminUi().queryByRole('dialog', { name: 'Frame' })).toBeNull()
    })
    expect(selectedLabel()).not.toBe('')
  },
}

export const PausedTimelineWide: Story = {
  name: 'Paused timeline wide',
  tags: ['@visual'],
  globals: { viewport: { value: 'wide', isRotated: false } },
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    const { page } = await import('vitest/browser')
    await page.viewport(1280, 800)
    await playWinningGame(canvasElement)
    const name = adminUi().getByRole('searchbox', { name: 'Name' })
    name.focus()
    await userEvent.type(name, 'makeMove')
    await waitFor(() => {
      expect(getAdminRoot().textContent).toContain('makeMove')
    })
    await matchAdminScreenshot('xo-gantt-wide', { width: 720, height: 640 })
  },
}

export const PausedTimelineNarrow: Story = {
  name: 'Paused timeline narrow',
  tags: ['@visual'],
  globals: { viewport: { value: 'narrow', isRotated: false } },
  render: () => renderXoGantt('narrow'),
  play: async ({ canvasElement }) => {
    await boot(canvasElement)
    const { page } = await import('vitest/browser')
    await page.viewport(560, 760)
    await playWinningGame(canvasElement)
    const name = adminUi().getByRole('searchbox', { name: 'Name' })
    name.focus()
    await userEvent.type(name, 'makeMove')
    await waitFor(() => {
      expect(getAdminRoot().textContent).toContain('makeMove')
    })
    await matchAdminScreenshot('xo-gantt-narrow', { width: 560, height: 640 })
  },
}
