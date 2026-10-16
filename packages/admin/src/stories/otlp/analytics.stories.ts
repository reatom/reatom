import type { Meta, StoryObj } from '@storybook/html'
import { expect, waitFor } from 'storybook/test'

import { renderOtlpChrome } from './boot'
import { STORY_ANALYTICS_BATCH, STORY_RESOURCE } from './fixtures'

const meta = {
  title: 'OTLP/Analytics',
  tags: ['@smoke'],
  parameters: {
    layout: 'fullscreen',
    vitest: { testTimeout: 30_000 },
  },
  render: () => renderOtlpChrome(STORY_ANALYTICS_BATCH, STORY_RESOURCE),
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function adminRoot(canvas: HTMLElement): ParentNode {
  const story =
    canvas.querySelector('[data-testid="otlp-chrome-story-root"]') ?? canvas
  const host = story.querySelector('[data-testid="otlp-chrome-host"]')
  if (host instanceof HTMLElement && host.shadowRoot) return host.shadowRoot
  return story
}

function clickElement(element: HTMLElement) {
  element.scrollIntoView({ block: 'center' })
  element.click()
}

function tabByLabel(root: ParentNode, label: string): HTMLElement {
  const tab = root.querySelector(`[role="tab"][aria-label="${label}"]`)
  if (!(tab instanceof HTMLElement)) throw new Error(`Tab not found: ${label}`)
  return tab
}

function kpiText(root: ParentNode, id: string): string {
  return (
    root.querySelector(`[data-testid="analytics-kpi-${id}"]`)?.textContent ?? ''
  )
}

export const AnalyticsTab: Story = {
  name: 'Analytics tab scopes entry sessions',
  play: async ({ canvasElement }) => {
    const root = adminRoot(canvasElement)
    clickElement(tabByLabel(root, 'Analytics'))
    await waitFor(() => {
      expect(kpiText(root, 'sessions')).toContain('8')
      expect(kpiText(root, 'visitors')).toContain('7')
    })

    const entry = root.querySelector(
      '[data-testid="analytics-breakdown-entry"] [data-row-id="/"]',
    )
    if (!(entry instanceof HTMLElement)) {
      throw new Error('Entry page / missing')
    }
    clickElement(entry)
    await waitFor(() => {
      expect(
        root.querySelector('[data-testid="analytics-scope"]')?.textContent,
      ).toContain('Entry pages: /')
      expect(kpiText(root, 'sessions')).toContain('6')
    })

    const remove = root.querySelector(
      '[data-testid="analytics-scope"] [aria-label="Remove session scope"]',
    )
    if (!(remove instanceof HTMLElement)) {
      throw new Error('Remove session scope missing')
    }
    clickElement(remove)
    await waitFor(() => {
      expect(root.querySelector('[data-testid="analytics-scope"]')).toBeNull()
      expect(kpiText(root, 'sessions')).toContain('8')
    })
  },
}

export const PathsUnit: Story = {
  name: 'Paths unit opens the typical session',
  play: async ({ canvasElement }) => {
    const root = adminRoot(canvasElement)
    clickElement(tabByLabel(root, 'Timeline'))
    const paths = root.querySelector('[data-testid="gantt-mode-paths"]')
    if (!(paths instanceof HTMLElement)) throw new Error('Paths missing')
    clickElement(paths)

    await waitFor(() => {
      const labels = [
        ...root.querySelectorAll('[data-testid="gantt-row-label"]'),
      ].map((node) => node.textContent ?? '')
      expect(labels).toEqual(
        expect.arrayContaining(['All sessions', '/', '/goods/:id', '/cart']),
      )
    })

    const cart = [...root.querySelectorAll('[data-path-id]')].find((row) => {
      const id = row.getAttribute('data-path-id') ?? ''
      return id.endsWith(' → /cart')
    })
    if (!(cart instanceof HTMLElement)) throw new Error('Cart step missing')
    clickElement(cart)
    await waitFor(() => {
      expect(
        root.querySelector('[data-testid="path-step-card"]')?.textContent,
      ).toContain('Median')
    })

    const align = root.querySelector('[data-testid="path-step-align"]')
    if (!(align instanceof HTMLElement)) throw new Error('Align here missing')
    clickElement(align)
    await waitFor(() => {
      expect(
        root.querySelector('[data-testid="gantt-summary"]')?.textContent,
      ).toContain('aligned at /cart')
      const alignAt = root.querySelector('select[aria-label="Align at"]')
      expect(alignAt).toBeInstanceOf(HTMLSelectElement)
      expect((alignAt as HTMLSelectElement).value).toBe('/cart')
    })

    const name = root.querySelector('[data-testid="filter-name"]')
    if (!(name instanceof HTMLInputElement)) {
      throw new Error('Name filter missing')
    }
    name.value = 'no-such-record'
    name.dispatchEvent(new Event('input', { bubbles: true }))
    await waitFor(() => {
      const alignAt = root.querySelector('select[aria-label="Align at"]')
      expect(alignAt).toBeInstanceOf(HTMLSelectElement)
      expect((alignAt as HTMLSelectElement).value).toBe('/cart')
    })
    name.value = ''
    name.dispatchEvent(new Event('input', { bubbles: true }))

    const open = root.querySelector(
      '[data-testid="gantt-open-typical-session"]',
    )
    if (!(open instanceof HTMLElement)) {
      throw new Error('Open typical session missing')
    }
    clickElement(open)
    await waitFor(() => {
      expect(
        root
          .querySelector('[data-testid="gantt-mode-waterfall"]')
          ?.getAttribute('aria-pressed'),
      ).toBe('true')
      expect(
        root.querySelector('[data-testid="analytics-scope"]')?.textContent,
      ).toContain('Typical session')
      const recordLabels = [
        ...root.querySelectorAll('[data-testid="gantt-row"][data-record-id]'),
      ].map(
        (row) =>
          row.querySelector('[data-testid="gantt-row-label"]')?.textContent,
      )
      expect(recordLabels.filter((label) => label !== 'In progress')).toEqual([
        'session.start',
        'app.page_view',
        'app.page.engagement',
        'app.page_view',
        'app.page.engagement',
        'app.page_view',
        'app.page.engagement',
        'app.page_view',
        'app.page.engagement',
      ])
      const card = root.querySelector('[data-reatom-name="FrameCard"]')
      expect(card?.textContent).toContain('app.page_view')
      expect(card?.textContent).toContain('url.path')
    })
  },
}
