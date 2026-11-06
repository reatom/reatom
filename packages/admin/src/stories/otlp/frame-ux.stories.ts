import type { Meta, StoryObj } from '@storybook/html'
import { expect as storybookExpect, waitFor } from 'storybook/test'

import {
  button,
  createActor,
  heading,
  role,
  text,
} from '../../../.storybook/helpers'
import type { AdminLocalValues } from '../../otlp'
import { ADMIN_FRAME } from '../../root'
import { getAdminRoot } from '../../testing/admin-root'
import { renderOtlpChrome, type OtlpChromeRenderOptions } from './boot'

// Storybook and the workspace's Vitest currently load different assertion typings.
const expect = storybookExpect as unknown as (typeof import('vitest'))['expect']
const I = createActor()
const ms = (value: number) => String(BigInt(value) * 1_000_000n)

function actionRecord(name: string, frame: string, outcome = 'ok') {
  return {
    name,
    traceId: 'frame-ux-trace',
    spanId: frame,
    startTimeUnixNano: ms(Number(frame) * 10),
    endTimeUnixNano: ms(Number(frame) * 10 + 2),
    attributes: {
      'reatom.name': name,
      'reatom.kind': 'action',
      'reatom.frame.id': frame,
      'reatom.cause.ids': [],
      'reatom.outcome': outcome,
      'reatom.params': '"[masked arguments]"',
      'reatom.payload': '"[masked result]"',
    },
  }
}

function renderLocalRecords(
  entries: Array<{ raw: object; values?: AdminLocalValues }>,
  width = 1120,
  options: Pick<OtlpChromeRenderOptions, 'source' | 'onReady'> = {},
) {
  const values = new WeakMap<object, AdminLocalValues>()
  for (const entry of entries) {
    if (entry.values) values.set(entry.raw, entry.values)
  }
  return renderOtlpChrome(
    [],
    { 'service.name': 'frame-ux' },
    {
      width,
      height: 720,
      source: options.source,
      onReady: (app) => {
        ADMIN_FRAME.run(() => {
          app.admin.setLocalValues((raw) =>
            typeof raw === 'object' && raw !== null
              ? values.get(raw)
              : undefined,
          )
          app.admin.ingest(entries.map((entry) => entry.raw))
        })
        options.onReady?.(app)
      },
    },
  )
}

/** Inspector structure is read inside the Admin shadow-root boundary. */
function frameCard(root: HTMLElement): HTMLElement {
  const card = root.querySelector('[data-reatom-name="FrameCard"]')
  if (!(card instanceof HTMLElement)) throw new Error('Frame card is missing')
  return card
}

function valueTrees(card: HTMLElement) {
  return card.querySelectorAll('[data-reatom-name="Inspector"]')
}

const meta = {
  title: 'OTLP/Frame details',
  tags: ['@smoke'],
  parameters: { layout: 'fullscreen', vitest: { testTimeout: 30_000 } },
  globals: { viewport: { value: 'wide', isRotated: false } },
  beforeEach: (context) => void I.init(context),
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ComputedCurrentState: Story = {
  name: 'Computed overview shows current state without its internal previous-state argument',
  render: () =>
    renderLocalRecords([
      { raw: actionRecord('change total', '1'), values: { params: [] } },
      {
        raw: {
          eventName: 'reatom.computed.update',
          traceId: 'frame-ux-trace',
          spanId: '1',
          timeUnixNano: ms(12),
          body: { currentTotal: '[masked current state]' },
          attributes: {
            'reatom.name': 'total',
            'reatom.kind': 'computed',
            'reatom.frame.id': '2',
            'reatom.cause.ids': ['1'],
            'reatom.params': '[{"previousTotal":41}]',
          },
        },
        values: {
          state: { currentTotal: 42 },
          params: [{ previousTotal: 41 }],
        },
      },
    ]),
  play: async () => {
    const root = getAdminRoot()
    await I.click(role('row', 'total').within(root).wait())
    await I.see(heading('total').within(root).wait())
    const card = frameCard(root)
    await I.see(text('currentTotal').within(card))
    await I.see(text('42').within(card))
    await I.dontSee(text('Param').within(card))
    await I.dontSee(text('previousTotal').within(card))
    expect(valueTrees(card)).toHaveLength(1)
    expect(
      card.querySelectorAll('[data-inspector-key="currentTotal"]'),
    ).toHaveLength(1)

    await I.click(role('tab', 'JSON').within(card))
    await I.see(text('attributes').within(card).wait())
    const attributes = card.querySelector<HTMLElement>(
      '[data-inspector-key="attributes"]',
    )!
    await I.click(role('button').within(attributes))
    await I.see(text('reatom.params').within(card).wait())
    await I.click(role('tab', 'Overview').within(card))
    await I.see(text('currentTotal').within(card).wait())
    await I.dontSee(text('Param').within(card))
  },
}

export const IdentityAction: Story = {
  name: 'An action returning its input shows the same object once',
  render: () => {
    const move = { message: 'same-reference', nested: { value: 42 } }
    return renderLocalRecords([
      {
        raw: actionRecord('echo move', '1'),
        values: { params: [move], payload: move },
      },
    ])
  },
  play: async () => {
    const root = getAdminRoot()
    await I.click(role('row', 'echo move').within(root).wait())
    await I.see(heading('echo move').within(root).wait())
    const card = frameCard(root)
    await I.see(text('Param').within(card))
    await I.see(text('"same-reference"').within(card))
    await I.see(text('42').within(card))
    expect(valueTrees(card)).toHaveLength(1)
    expect(
      card.querySelectorAll('[data-inspector-key="message"]'),
    ).toHaveLength(1)
    expect(card.querySelector('[data-inspector-key="value"]')).toBeVisible()
  },
}

export const DistinctActionResult: Story = {
  name: 'Equal-shaped input and result remain two separate values',
  render: () =>
    renderLocalRecords([
      {
        raw: actionRecord('copy move', '1'),
        values: {
          params: [{ message: 'same-value' }],
          payload: { message: 'same-value' },
        },
      },
    ]),
  play: async () => {
    const root = getAdminRoot()
    await I.click(role('row', 'copy move').within(root).wait())
    await I.see(heading('copy move').within(root).wait())
    const card = frameCard(root)
    await I.see(text('Param').within(card))
    await I.seeNumberOfElements(text('"same-value"').within(card).all(), 2)
    expect(valueTrees(card)).toHaveLength(2)
    expect(
      card.querySelectorAll('[data-inspector-key="message"]'),
    ).toHaveLength(2)
  },
}

export const UndefinedAndFailedResults: Story = {
  name: 'Void results, undefined arguments, and errors keep their own meaning',
  render: () =>
    renderLocalRecords([
      {
        raw: actionRecord('void result', '1'),
        values: { params: [], payload: undefined },
      },
      {
        raw: actionRecord('undefined argument', '2'),
        values: { params: [undefined], payload: undefined },
      },
      {
        raw: {
          ...actionRecord('failed request', '3', 'error'),
          status: { code: 2, message: 'Request failed' },
        },
        values: {
          params: [{ request: 'failed-input' }],
          error: new Error('Request failed'),
        },
      },
    ]),
  play: async () => {
    const root = getAdminRoot()
    await I.click(role('row', 'void result').within(root).wait())
    await I.see(heading('void result').within(root).wait())
    let card = frameCard(root)
    await I.see(text('undefined').within(card))
    await I.dontSee(text('Param').within(card))
    expect(valueTrees(card)).toHaveLength(1)

    await I.click(role('row', 'undefined argument').within(root))
    await I.see(heading('undefined argument').within(root).wait())
    card = frameCard(root)
    await I.see(text('Param').within(card))
    await I.seeNumberOfElements(text('undefined').within(card).all(), 2)
    expect(valueTrees(card)).toHaveLength(2)

    await I.click(role('row', 'failed request').within(root))
    await I.see(heading('failed request').within(root).wait())
    card = frameCard(root)
    const error = await I.see(role('alert').within(card))
    expect(error).toHaveTextContent('Request failed')
    await I.see(text('Param').within(card))
    await I.see(text('"failed-input"').within(card))
    await I.dontSee(text('undefined').within(card))
    expect(valueTrees(card)).toHaveLength(1)
  },
}

export const CloseWide: Story = {
  name: 'The wide details close button returns to the selected row and allows reopening',
  render: () =>
    renderLocalRecords([
      {
        raw: actionRecord('close target', '1'),
        values: { params: [], payload: 42 },
      },
    ]),
  play: async () => {
    const root = getAdminRoot()
    const row = await I.see(role('row', 'close target').within(root).wait())
    await I.click(role('row', 'close target').within(root))
    await I.see(heading('close target').within(root).wait())
    await I.dontSee(role('dialog', 'Frame').within(root))
    await I.click(button('Close record details').within(root))
    await I.waitExit(heading('close target').within(root))
    await I.seeAttribute(
      role('row', 'close target').within(root),
      'aria-selected',
      'true',
    )
    await waitFor(() =>
      expect((root.getRootNode() as ShadowRoot).activeElement).toBe(row),
    )
    await I.click(role('row', 'close target').within(root))
    await I.see(heading('close target').within(root).wait())
    await I.see(text('42').within(frameCard(root)))
  },
}

export const CloseNarrow: Story = {
  name: 'The narrow details close button returns to the selected row and allows reopening',
  globals: { viewport: { value: 'narrow', isRotated: false } },
  render: () =>
    renderLocalRecords(
      [
        {
          raw: actionRecord('close target', '1'),
          values: { params: [], payload: 42 },
        },
      ],
      560,
    ),
  play: async () => {
    const root = getAdminRoot()
    const row = await I.see(role('row', 'close target').within(root).wait())
    await I.click(role('row', 'close target').within(root))
    await I.see(role('dialog', 'Frame').within(root).wait())
    await I.see(heading('close target').within(root))
    await I.click(button('Close record details').within(root))
    await I.waitExit(role('dialog', 'Frame').within(root))
    await I.seeAttribute(
      role('row', 'close target').within(root),
      'aria-selected',
      'true',
    )
    await waitFor(() =>
      expect((root.getRootNode() as ShadowRoot).activeElement).toBe(row),
    )
    await I.click(role('row', 'close target').within(root))
    await I.see(role('dialog', 'Frame').within(root).wait())
    await I.see(text('42').within(frameCard(root)))
  },
}

let appendUnrelatedRecord: () => void

export const LiveCapturePreservesCopySelection: Story = {
  name: 'Live capture preserves selected JSON text through Meta and native copy',
  render: () =>
    renderLocalRecords(
      [
        {
          raw: actionRecord('copy target', '1'),
          values: { params: [], payload: 42 },
        },
      ],
      1120,
      {
        source: 'live',
        onReady: (app) => {
          appendUnrelatedRecord = () =>
            ADMIN_FRAME.run(() => {
              app.admin.ingest([actionRecord('unrelated capture', '2')])
            })
        },
      },
    ),
  play: async () => {
    const root = getAdminRoot()
    await I.click(role('row', 'copy target').within(root).wait())
    await I.see(heading('copy target').within(root).wait())
    const card = frameCard(root)
    await I.click(role('tab', 'JSON').within(card))
    await I.see(text('name').within(card).wait())

    const inspector = valueTrees(card)[0]!
    const leaf = card.querySelector<HTMLElement>(
      '[data-inspector-key="name"] [data-inspector-leaf] > span',
    )!
    const textNode = leaf.firstChild!
    const selection = window.getSelection()!
    const range = document.createRange()
    range.selectNodeContents(leaf)
    selection.removeAllRanges()
    selection.addRange(range)
    expect(selection.toString()).toBe('"copy target"')

    appendUnrelatedRecord()
    await I.see(role('row', 'unrelated capture').within(root).wait())
    expect(valueTrees(frameCard(root))[0]).toBe(inspector)
    expect(leaf.firstChild).toBe(textNode)
    expect(textNode.isConnected).toBe(true)
    expect(selection.toString()).toBe('"copy target"')

    if (import.meta.env['VITEST']) {
      // Provider keyboard input exercises browser-native copy in the test page.
      const { userEvent } = await import('vitest/browser')
      await userEvent.keyboard('{Meta>}')
      expect(valueTrees(frameCard(root))[0]).toBe(inspector)
      expect(selection.toString()).toBe('"copy target"')
      await userEvent.keyboard('{/Meta}')
      let copyEvent: Event | undefined
      root.addEventListener(
        'copy',
        (event) => {
          copyEvent = event
        },
        { once: true },
      )
      await userEvent.copy()
      expect(copyEvent?.isTrusted).toBe(true)
      expect(copyEvent?.defaultPrevented).toBe(false)
    } else {
      await I.press('{Meta>}c{/Meta}')
    }
    expect(valueTrees(frameCard(root))[0]).toBe(inspector)
    expect(leaf.firstChild).toBe(textNode)
    expect(textNode.isConnected).toBe(true)
    expect(selection.toString()).toBe('"copy target"')
    selection.removeAllRanges()
  },
}

export const StructurallyEqualChanges: Story = {
  name: 'Equal atom and computed states warn until disabled in Settings',
  render: () =>
    renderLocalRecords(
      (['atom', 'computed'] as const).flatMap((kind, group) =>
        [0, 1, 2].map((step) => ({
          raw: {
            eventName: `reatom.${kind}.update`,
            traceId: 'equal-state-trace',
            spanId: String(group * 3 + step + 1),
            timeUnixNano: ms(group * 30 + step * 10),
            body: { nested: [step === 2 ? 2 : 1] },
            attributes: {
              'reatom.name': `equal.${kind}.set`,
              'reatom.kind': kind,
              'reatom.frame.id': String(group * 3 + step + 1),
              'reatom.cause.ids': [],
            },
          },
          values: { state: { nested: [step === 2 ? 2 : 1] } },
        })),
      ),
    ),
  play: async () => {
    const root = getAdminRoot()
    const message =
      'Captured state is structurally equal to the previous captured state'
    const grid = await I.see(role('grid', 'Causal records').within(root).wait())
    await I.seeNumberOfElements(role('note', message).within(grid).all(), 2)
    const atomRows = (await I.resolveLocator(
      role('row', 'equal.atom.set').within(grid).all(),
    )) as HTMLElement[]
    await I.dontSee(role('note', message).within(atomRows[0]!))
    await I.dontSee(role('note', message).within(atomRows[2]!))
    await I.click(role('note', message).within(atomRows[1]!))
    await I.see(text(message).within(frameCard(root)).wait())
    await I.click(role('tab', 'Settings').within(root))
    const toggle = role('switch', 'Structurally equal changes').within(root)
    await I.seeAttribute(toggle, 'aria-checked', 'true')
    await I.click(toggle)
    await I.seeAttribute(toggle, 'aria-checked', 'false')
    await I.click(role('tab', 'Timeline').within(root))
    await I.dontSee(role('note', message).within(root))
    await I.click(role('tab', 'Settings').within(root))
    await I.click(toggle)
    await I.click(role('tab', 'Timeline').within(root))
    await I.see(role('note', message).within(frameCard(root)).wait())
  },
}
