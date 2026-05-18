import {
  computed,
  reatomBoolean,
  reatomEnum,
  withLocalStorage,
} from '@reatom/core'

export const colorSchemes = ['light', 'dark'] as const
export type DashboardColorScheme = (typeof colorSchemes)[number]

export const densities = ['comfortable', 'compact'] as const
export type DashboardDensity = (typeof densities)[number]

export const colorSchemeAtom = reatomEnum(colorSchemes, {
  name: 'settings.colorScheme',
  initState: 'light',
}).extend(withLocalStorage('reatom-mantine-dashboard.color-scheme'))

export const densityAtom = reatomEnum(densities, {
  name: 'settings.density',
  initState: 'comfortable',
}).extend(withLocalStorage('reatom-mantine-dashboard.density'))

export const emailDigestAtom = reatomBoolean(
  true,
  'settings.emailDigest',
).extend(withLocalStorage('reatom-mantine-dashboard.email-digest'))

export const sidebarCollapsedAtom = reatomBoolean(
  false,
  'settings.sidebarCollapsed',
).extend(withLocalStorage('reatom-mantine-dashboard.sidebar-collapsed'))

export const settingsSnapshotAtom = computed(
  () => ({
    colorScheme: colorSchemeAtom(),
    density: densityAtom(),
    emailDigest: emailDigestAtom(),
    sidebarCollapsed: sidebarCollapsedAtom(),
  }),
  'settings.snapshot',
)
