import { atom, reatomBoolean } from '@reatom/core'

export { activeFilterCount } from './filters'

export const filterPanelOpen = atom(false, 'filterPanelOpen')
export const settingsPanelOpen = atom(false, 'settingsPanelOpen')
export const imageInfoPanelOpen = reatomBoolean(false, 'imageInfoPanel.open')
