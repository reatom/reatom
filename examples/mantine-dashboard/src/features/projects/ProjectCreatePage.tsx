import {
  Alert,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { wrap } from '@reatom/core'
import { bindField, reatomComponent } from '@reatom/react'
import type { FormEvent } from 'react'

import type { ProjectPriority } from '../../shared/api/types'
import { projectPriorities } from '../../shared/api/types'
import type { ProjectCreateForm } from './projectForms'
import { humanize } from './projectUi'

export type ProjectCreatePageModel = {
  form: ProjectCreateForm
  cancel: () => unknown
}

const priorityOptions = projectPriorities.map((priority) => ({
  value: priority,
  label: humanize(priority),
}))

export const ProjectCreatePage = reatomComponent(
  ({ model, refreshing }: { model: ProjectCreatePageModel; refreshing?: boolean }) => {
    const { form } = model
    const submitError = form.submit.error()

    return (
      <Stack gap="lg">
        <div>
          <Title order={1}>New project</Title>
          <Text c="dimmed">
            A route-scoped form posts to the mocked backend and navigates on success.
          </Text>
        </div>

        {submitError && (
          <Alert color="red" title="Unable to create project">
            {submitError.message}
          </Alert>
        )}

        <Card withBorder radius="lg" p="lg" maw={760}>
          <form
            onSubmit={wrap((event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              form.submit()
            })}
          >
            <Stack gap="md">
              <TextInput label="Name" {...bindField(form.fields.name)} />
              <Textarea
                label="Description"
                minRows={4}
                autosize
                {...bindField(form.fields.description)}
              />
              <Group grow align="start">
                <Select
                  label="Priority"
                  data={priorityOptions}
                  allowDeselect={false}
                  value={form.fields.priority.value()}
                  error={form.fields.priority.validation().error}
                  onChange={wrap((value: string | null) => {
                    if (value) form.fields.priority.set(value as ProjectPriority)
                  })}
                />
                <TextInput label="Budget" inputMode="numeric" {...bindField(form.fields.budget)} />
              </Group>
              <TextInput
                label="Tags"
                description="Comma separated tags"
                {...bindField(form.fields.tags)}
              />

              <Group justify="flex-end">
                <Button variant="default" type="button" onClick={wrap(() => model.cancel())}>
                  Cancel
                </Button>
                <Button type="submit" loading={!form.submit.ready() || refreshing}>
                  Create project
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      </Stack>
    )
  },
  'ProjectCreatePage',
)
