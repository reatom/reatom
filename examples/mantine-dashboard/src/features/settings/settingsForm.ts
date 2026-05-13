import { reatomForm } from '@reatom/core'
import { z } from 'zod/v4'

import type { SettingsInput } from '../../shared/api/types'
import { colorSchemes, densities } from './settingsModel'

export const settingsSchema = z.object({
  name: z.string().min(2, 'Use at least 2 characters'),
  title: z.string().min(2, 'Use at least 2 characters'),
  colorScheme: z.enum(colorSchemes),
  density: z.enum(densities),
  emailDigest: z.boolean(),
  sidebarCollapsed: z.boolean(),
})

export type SettingsValues = z.infer<typeof settingsSchema>

export const reatomSettingsForm = (
  initialState: SettingsInput,
  onSubmit: (values: SettingsInput) => Promise<SettingsInput>,
) =>
  reatomForm(initialState, {
    name: 'settings.form',
    validateOnBlur: true,
    schema: settingsSchema,
    onSubmit,
  })

export type SettingsForm = ReturnType<typeof reatomSettingsForm>
