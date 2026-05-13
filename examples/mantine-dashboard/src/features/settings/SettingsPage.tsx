import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { wrap } from '@reatom/core'
import { bindField, reatomComponent } from '@reatom/react'
import type { FormEvent } from 'react'

import { settingsSnapshotAtom } from './settingsModel'
import type { DashboardColorScheme, DashboardDensity } from './settingsModel'
import { colorSchemes, densities } from './settingsModel'
import type { SettingsForm } from './settingsForm'

export type SettingsPageModel = {
  form: SettingsForm
}

const colorSchemeOptions = colorSchemes.map((value) => ({
  value,
  label: value === 'dark' ? 'Dark' : 'Light',
}))

const densityOptions = densities.map((value) => ({
  value,
  label: value === 'compact' ? 'Compact' : 'Comfortable',
}))

export const SettingsPage = reatomComponent(
  ({ model, refreshing }: { model: SettingsPageModel; refreshing?: boolean }) => {
    const { form } = model
    const submitError = form.submit.error()
    const snapshot = settingsSnapshotAtom()

    return (
      <Stack gap="lg">
        <Group justify="space-between" align="start">
          <div>
            <Title order={1}>Settings</Title>
            <Text c="dimmed">
              Persisted Reatom atoms pre-fill this route-scoped form.
            </Text>
          </div>
          {refreshing && <Text c="dimmed">Refreshing...</Text>}
        </Group>

        {submitError && (
          <Alert color="red" title="Unable to save settings">
            {submitError.message}
          </Alert>
        )}

        <Grid>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card withBorder radius="lg" p="lg">
              <form
                onSubmit={wrap((event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault()
                  form.submit()
                })}
              >
                <Stack gap="md">
                  <Title order={3}>Profile</Title>
                  <TextInput label="Display name" {...bindField(form.fields.name)} />
                  <TextInput label="Title" {...bindField(form.fields.title)} />

                  <Title order={3} mt="md">
                    Preferences
                  </Title>
                  <Select
                    label="Color scheme"
                    data={colorSchemeOptions}
                    allowDeselect={false}
                    value={form.fields.colorScheme.value()}
                    error={form.fields.colorScheme.validation().error}
                    onChange={wrap((value: string | null) => {
                      if (value) form.fields.colorScheme.set(value as DashboardColorScheme)
                    })}
                  />
                  <Select
                    label="Density"
                    data={densityOptions}
                    allowDeselect={false}
                    value={form.fields.density.value()}
                    error={form.fields.density.validation().error}
                    onChange={wrap((value: string | null) => {
                      if (value) form.fields.density.set(value as DashboardDensity)
                    })}
                  />
                  <Switch
                    label="Email digest"
                    description="Persisted in localStorage and submitted to the fake backend."
                    {...bindField(form.fields.emailDigest)}
                  />
                  <Switch
                    label="Collapse navigation"
                    description="This preference controls the private app shell immediately after save."
                    {...bindField(form.fields.sidebarCollapsed)}
                  />

                  <Button type="submit" loading={!form.submit.ready() || refreshing} w="fit-content">
                    Save preferences
                  </Button>
                </Stack>
              </form>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card withBorder radius="lg" p="lg">
              <Stack gap="xs">
                <Title order={3}>Current persisted snapshot</Title>
                <Text c="dimmed" size="sm">
                  These values are atom getters, not React state.
                </Text>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    )
  },
  'SettingsPage',
)
