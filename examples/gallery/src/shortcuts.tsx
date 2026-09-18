import { bindKeyboardShortcutsListener } from './model'

export const KeyboardShortcuts = () => (
  <div
    style={{ display: 'none' }}
    ref={() => {
      const stop = bindKeyboardShortcutsListener()
      return stop
    }}
  />
)
