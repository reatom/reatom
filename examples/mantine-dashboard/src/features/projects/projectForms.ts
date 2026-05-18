import { reatomForm } from '@reatom/core'
import { z } from 'zod/v4'

import type {
  Project,
  ProjectCreateInput,
  ProjectListQuery,
} from '../../shared/api/types'
import { projectPriorities, statusFilters } from '../../shared/api/types'

export const projectFilterSchema = z.object({
  q: z.string(),
  status: z.enum(statusFilters),
})

export type ProjectFilterValues = z.infer<typeof projectFilterSchema>

export const reatomProjectFilterForm = (
  initialState: Pick<ProjectListQuery, 'q' | 'status'>,
  onSubmit: (values: ProjectFilterValues) => void,
) =>
  reatomForm(initialState, {
    name: 'projects.filterForm',
    schema: projectFilterSchema,
    onSubmit,
  })

export type ProjectFilterForm = ReturnType<typeof reatomProjectFilterForm>

export const projectCreateSchema = z.object({
  name: z.string().min(3, 'Use at least 3 characters'),
  description: z.string().min(12, 'Describe the outcome'),
  priority: z.enum(projectPriorities),
  budget: z
    .string()
    .min(1, 'Budget is required')
    .refine((value) => Number(value) > 0, 'Budget must be positive'),
  tags: z.string(),
})

export type ProjectCreateValues = z.infer<typeof projectCreateSchema>

export const toProjectCreateInput = (
  values: ProjectCreateValues,
): ProjectCreateInput => ({
  name: values.name.trim(),
  description: values.description.trim(),
  priority: values.priority,
  budget: Number(values.budget),
  tags: values.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean),
})

export const reatomProjectCreateForm = (
  onSubmit: (values: ProjectCreateValues) => Promise<Project>,
) =>
  reatomForm(
    {
      name: '',
      description: '',
      priority: 'medium' as ProjectCreateValues['priority'],
      budget: '25000',
      tags: 'dashboard, demo',
    },
    {
      name: 'projects.createForm',
      validateOnBlur: true,
      schema: projectCreateSchema,
      onSubmit,
    },
  )

export type ProjectCreateForm = ReturnType<typeof reatomProjectCreateForm>
