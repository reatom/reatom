import { notifications } from '@mantine/notifications'
import { action } from '@reatom/core'

export type AppToast = {
  title: string
  message: string
  color?: string
}

export const showToastAction = action((toast: AppToast) => {
  notifications.show(toast)
}, 'toasts.show')
