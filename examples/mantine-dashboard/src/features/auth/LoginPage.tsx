import {
  Alert,
  Anchor,
  Button,
  Card,
  Code,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { wrap } from '@reatom/core'
import { bindField, reatomComponent } from '@reatom/react'
import type { FormEvent } from 'react'

import type { LoginForm } from './authForms'

export type LoginPageModel = {
  form: LoginForm
  goRegister: () => unknown
}

export const LoginPage = reatomComponent(
  ({ model, refreshing }: { model: LoginPageModel; refreshing?: boolean }) => {
    const { form } = model
    const submitError = form.submit.error()

    return (
      <Card withBorder shadow="md" radius="xl" p="xl" maw={460} w="100%">
        <Stack gap="lg">
          <Stack gap={4}>
            <Text size="sm" fw={700} c="indigo">
              Reatom 1001 RC + Mantine 9.2
            </Text>
            <Title order={1}>Sign in</Title>
            <Text c="dimmed">
              Public route with a route-scoped Reatom form and fake backend delay.
            </Text>
          </Stack>

          <Alert color="blue" title="Demo credentials">
            <Text size="sm">
              Email <Code>{form.fields.email.value()}</Code>, password{' '}
              <Code>password</Code>
            </Text>
          </Alert>

          {submitError && (
            <Alert color="red" title="Unable to sign in">
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
              <TextInput label="Email" type="email" {...bindField(form.fields.email)} />
              <PasswordInput label="Password" {...bindField(form.fields.password)} />
              <Button type="submit" loading={!form.submit.ready() || refreshing}>
                Sign in
              </Button>
            </Stack>
          </form>

          <Group justify="center" gap="xs">
            <Text size="sm" c="dimmed">
              Need a separate public route?
            </Text>
            <Anchor component="button" type="button" onClick={wrap(() => model.goRegister())}>
              Create account
            </Anchor>
          </Group>
        </Stack>
      </Card>
    )
  },
  'LoginPage',
)
