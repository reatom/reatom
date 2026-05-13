import {
  Alert,
  Button,
  Card,
  Center,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import type { ReactNode } from 'react'

export function PageLoader({ label = 'Loading data...' }: { label?: string }) {
  return (
    <Center mih={360}>
      <Stack align="center" gap="sm">
        <Loader size="lg" />
        <Text c="dimmed">{label}</Text>
      </Stack>
    </Center>
  )
}

export function PageError({
  error,
  onRetry,
}: {
  error: Error
  onRetry?: () => void
}) {
  return (
    <Center mih={360}>
      <Alert color="red" title="Something went wrong" maw={520} w="100%">
        <Stack gap="md">
          <Text size="sm">{error.message}</Text>
          {onRetry && (
            <Button variant="light" color="red" onClick={onRetry} w="fit-content">
              Retry
            </Button>
          )}
        </Stack>
      </Alert>
    </Center>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card withBorder radius="lg" p="xl">
      <Stack align="center" gap="xs" ta="center">
        <Title order={3}>{title}</Title>
        <Text c="dimmed" maw={420}>
          {description}
        </Text>
        {action}
      </Stack>
    </Card>
  )
}
