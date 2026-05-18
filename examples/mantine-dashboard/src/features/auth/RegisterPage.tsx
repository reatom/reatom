import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { wrap } from '@reatom/core'
import { bindField, reatomComponent } from '@reatom/react'
import type { FormEvent } from 'react'

import type { UserRole } from '../../shared/api/types'
import { userRoles } from '../../shared/api/types'
import type { RegisterForm } from './authForms'

export type RegisterPageModel = {
  form: RegisterForm
  goLogin: () => unknown
}

const roleOptions = userRoles.map((role) => ({
  value: role,
  label: role[0]!.toUpperCase() + role.slice(1),
}))

export const RegisterPage = reatomComponent(
  ({ model, refreshing }: { model: RegisterPageModel; refreshing?: boolean }) => {
    const { form } = model
    const submitError = form.submit.error()
    const roleError = form.fields.role.validation().error

    return (
      <Card withBorder shadow="md" radius="xl" p="xl" maw={500} w="100%">
        <Stack gap="lg">
          <Stack gap={4}>
            <Text size="sm" fw={700} c="teal">
              Public registration
            </Text>
            <Title order={1}>Create demo account</Title>
            <Text c="dimmed">
              The account is stored by the fake backend in localStorage.
            </Text>
          </Stack>

          {submitError && (
            <Alert color="red" title="Unable to register">
              {submitError.message}
            </Alert>
          )}

          <form
            onSubmit={wrap((event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              form.submit()
            })}
          >
            <Stack gap="md">
              <TextInput label="Name" {...bindField(form.fields.name)} />
              <TextInput label="Email" type="email" {...bindField(form.fields.email)} />
              <Select
                label="Role"
                data={roleOptions}
                allowDeselect={false}
                value={form.fields.role.value()}
                error={roleError}
                onChange={wrap((value: string | null) => {
                  if (value) form.fields.role.set(value as UserRole)
                })}
              />
              <PasswordInput label="Password" {...bindField(form.fields.password)} />
              <Button type="submit" loading={!form.submit.ready() || refreshing}>
                Create workspace
              </Button>
            </Stack>
          </form>

          <Group justify="center" gap="xs">
            <Text size="sm" c="dimmed">
              Already have a demo session?
            </Text>
            <Anchor component="button" type="button" onClick={wrap(() => model.goLogin())}>
              Sign in
            </Anchor>
          </Group>
        </Stack>
      </Card>
    )
  },
  'RegisterPage',
)
