import type { Atom } from '@reatom/core'

import {
  focusVisible,
  reducedMotion,
  scrollable,
  tokens,
  type,
} from '../design-system'
import {
  adminSettings,
  type AdminPanelCorner,
  type AdminSettings,
} from '../settings'

interface SettingsOption {
  id: string
  label: string
  description?: string
  checked: Atom<boolean>
}

interface SettingsSection {
  id: string
  title: string
  empty?: string
  options: Array<SettingsOption>
}

let switchCounter = 0

export const SettingsSwitch = ({
  label,
  description,
  checked,
}: {
  label: string
  description?: string
  checked: Atom<boolean>
}) => {
  const id = ++switchCounter
  const labelId = `admin-settings-switch-${id}`
  const descriptionId = description
    ? `admin-settings-switch-${id}-description`
    : undefined

  return (
    <button
      type="button"
      role="switch"
      aria-checked={() => (checked() ? 'true' : 'false')}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      on:click={() => {
        checked.set(!checked())
      }}
      css={`
        display: inline-flex;
        align-items: center;
        gap: var(--admin-space-8);
        min-height: var(--admin-control-height);
        padding: var(--admin-space-8);
        border: 1px solid ${tokens.border1};
        border-radius: var(--admin-radius-4);
        background: ${tokens.surface2};
        color: ${tokens.text1};
        ${type.ui}
        text-align: start;
        cursor: pointer;
        ${focusVisible}
        & > [data-track] {
          position: relative;
          flex: none;
          width: 24px;
          height: 14px;
          border-radius: 7px;
          background: ${tokens.surface3};
          border: 1px solid ${tokens.border2};
          ${reducedMotion}
          transition:
            background var(--admin-motion-select) ease,
            border-color var(--admin-motion-select) ease;
        }
        & > [data-track]::after {
          content: '';
          position: absolute;
          top: 1px;
          left: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${tokens.text2};
          ${reducedMotion}
          transition:
            left var(--admin-motion-select) ease,
            background var(--admin-motion-select) ease;
        }
        &[aria-checked='true'] > [data-track] {
          background: ${tokens.accent};
          border-color: ${tokens.accent};
        }
        &[aria-checked='true'] > [data-track]::after {
          left: 11px;
          background: ${tokens.canvas};
        }
      `}
    >
      <span data-track="" aria-hidden="true" />
      <span
        css={`
          display: grid;
          gap: var(--admin-space-2);
          min-width: 0;
        `}
      >
        <span id={labelId}>{label}</span>
        {description ? (
          <span
            id={descriptionId}
            css={`
              ${type.meta}
              color: ${tokens.text2};
            `}
          >
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', title: 'Always use the light palette' },
  { id: 'dark', label: 'Dark', title: 'Always use the dark palette' },
  { id: 'system', label: 'System', title: 'Follow this device' },
] as const

let appearanceCounter = 0

function moveAppearanceChoice<T extends string>(
  event: KeyboardEvent,
  value: { (): T; set(next: T): void },
  ids: readonly T[],
): void {
  const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
  const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
  const home = event.key === 'Home'
  const end = event.key === 'End'
  if (!forward && !backward && !home && !end) return
  event.preventDefault()
  const currentIndex = Math.max(0, ids.indexOf(value()))
  const nextIndex = home
    ? 0
    : end
      ? ids.length - 1
      : forward
        ? (currentIndex + 1) % ids.length
        : (currentIndex - 1 + ids.length) % ids.length
  const nextId = ids[nextIndex]
  if (nextId === undefined) return
  value.set(nextId)
  if (!(event.currentTarget instanceof HTMLElement)) return
  event.currentTarget
    .querySelector<HTMLElement>(`[data-choice="${nextId}"]`)
    ?.focus()
}

function AppearanceRadios<T extends string>({
  label,
  value,
  options,
}: {
  label: string
  value: { (): T; set(next: T): void }
  options: ReadonlyArray<{ id: T; label: string; title: string }>
}) {
  const labelId = `admin-appearance-${++appearanceCounter}`
  const ids = options.map((option) => option.id)

  return (
    <div
      css={`
        display: grid;
        gap: var(--admin-space-8);
      `}
    >
      <span
        id={labelId}
        css={`
          ${type.ui}
          color: ${tokens.text2};
        `}
      >
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        on:keydown={(event: KeyboardEvent) => {
          moveAppearanceChoice(event, value, ids)
        }}
        css={`
          display: flex;
          flex-wrap: wrap;
          gap: var(--admin-space-8);
        `}
      >
        {options.map((option) => (
          <button
            type="button"
            role="radio"
            data-choice={option.id}
            title={option.title}
            aria-checked={() => (value() === option.id ? 'true' : 'false')}
            tabindex={() => (value() === option.id ? 0 : -1)}
            on:click={() => {
              value.set(option.id)
            }}
            css={`
              display: inline-flex;
              align-items: center;
              gap: var(--admin-space-8);
              min-height: var(--admin-control-height);
              padding: var(--admin-space-8);
              border: 1px solid ${tokens.border1};
              border-radius: var(--admin-radius-4);
              background: ${tokens.surface2};
              color: ${tokens.text1};
              ${type.ui}
              cursor: pointer;
              ${focusVisible}
              &[aria-checked='true'] {
                border-color: ${tokens.accent};
                background: ${tokens.surface3};
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function AppearanceSection({ settings }: { settings: AdminSettings }) {
  return (
    <section
      css={`
        display: grid;
        gap: var(--admin-space-12);
      `}
    >
      <h2
        css={`
          ${type.title}
          margin: 0;
          color: ${tokens.text1};
        `}
      >
        Appearance
      </h2>
      <p
        css={`
          ${type.body}
          margin: 0;
          color: ${tokens.text2};
        `}
      >
        Light, Dark, or the device scheme. The accent color builds the palette.
      </p>
      <AppearanceRadios
        label="Theme"
        value={settings.scheme}
        options={THEME_OPTIONS}
      />
      <label
        css={`
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--admin-space-8);
          min-height: var(--admin-control-height);
          padding: var(--admin-space-8);
          border: 1px solid ${tokens.border1};
          border-radius: var(--admin-radius-4);
          background: ${tokens.surface2};
          color: ${tokens.text1};
          ${type.ui}
        `}
      >
        <span>Accent</span>
        <input
          type="color"
          aria-label="Accent"
          model:value={settings.accent}
          css={`
            width: 28px;
            height: 28px;
            padding: 0;
            border: 1px solid ${tokens.border2};
            border-radius: var(--admin-radius-4);
            background: transparent;
            cursor: pointer;
            ${focusVisible}
          `}
        />
      </label>
      <p
        css={`
          ${type.meta}
          margin: 0;
          color: ${tokens.text3};
        `}
      >
        {() => `Showing ${settings.resolvedScheme()}`}
      </p>
    </section>
  )
}

const CORNER_OPTIONS: ReadonlyArray<{
  id: AdminPanelCorner
  label: string
  title: string
}> = [
  {
    id: 'top-left',
    label: 'Top left',
    title: 'Dock the panel to the top left',
  },
  {
    id: 'top-right',
    label: 'Top right',
    title: 'Dock the panel to the top right',
  },
  {
    id: 'bottom-left',
    label: 'Bottom left',
    title: 'Dock the panel to the bottom left',
  },
  {
    id: 'bottom-right',
    label: 'Bottom right',
    title: 'Dock the panel to the bottom right',
  },
]

function WindowSection({ settings }: { settings: AdminSettings }) {
  return (
    <section
      css={`
        display: grid;
        gap: var(--admin-space-12);
      `}
    >
      <h2
        css={`
          ${type.title}
          margin: 0;
          color: ${tokens.text1};
        `}
      >
        Window
      </h2>
      <p
        css={`
          ${type.body}
          margin: 0;
          color: ${tokens.text2};
        `}
      >
        Closing the panel leaves its icon in this corner.
      </p>
      <AppearanceRadios
        label="Panel corner"
        value={settings.corner}
        options={CORNER_OPTIONS}
      />
    </section>
  )
}

function settingsSections(settings: AdminSettings): Array<SettingsSection> {
  return [
    {
      id: 'display',
      title: 'Display',
      options: [
        {
          id: 'icons',
          label: 'Icons',
          description: 'Show kind icons next to record names',
          checked: settings.icons,
        },
        {
          id: 'colors',
          label: 'Colors',
          description: 'Color records by kind: bars, row bands, chips',
          checked: settings.colors,
        },
        {
          id: 'equal-state-warnings',
          label: 'Structurally equal changes',
          description:
            'Warn when consecutive captured atom or computed states are structurally equal',
          checked: settings.equalStateWarnings,
        },
        {
          id: 'graph-continuations',
          label: 'Graph continuations',
          description:
            'Show navigation to graph connections above or below the viewport',
          checked: settings.graphContinuations,
        },
      ],
    },
    {
      id: 'local-work',
      title: 'Local work',
      empty: 'No local-work options from this source yet.',
      options: settings.localWorkOptions().map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        checked: option.checked,
      })),
    },
  ]
}

export const SettingsScreen = () => {
  const settings = adminSettings()

  return (
    <div
      data-reatom-name="SettingsScreen"
      css={`
        ${scrollable}
        height: 100%;
        padding: var(--admin-space-16);
      `}
    >
      <div
        css={`
          display: grid;
          gap: var(--admin-space-24);
          width: min(560px, 100%);
        `}
      >
        <AppearanceSection settings={settings} />
        <WindowSection settings={settings} />
        {() =>
          settingsSections(settings).map((section) => (
            <section
              css={`
                display: grid;
                gap: var(--admin-space-8);
                & > button {
                  width: 100%;
                  justify-content: flex-start;
                }
              `}
            >
              <h2
                css={`
                  ${type.title}
                  margin: 0;
                  color: ${tokens.text1};
                `}
              >
                {section.title}
              </h2>
              {section.options.length === 0 ? (
                <p
                  css={`
                    ${type.body}
                    margin: 0;
                    color: ${tokens.text2};
                  `}
                >
                  {section.empty}
                </p>
              ) : (
                section.options.map((option) => (
                  <SettingsSwitch
                    label={option.label}
                    description={option.description}
                    checked={option.checked}
                  />
                ))
              )}
            </section>
          ))
        }
      </div>
    </div>
  )
}
