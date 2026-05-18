import { Button, Card, Center, Stack, Text, Title } from '@mantine/core'

export function NotFoundPage({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <Center mih={360}>
      <Card withBorder radius="lg" p="xl" maw={520} w="100%">
        <Stack gap="sm" align="center" ta="center">
          <Text fw={700} c="indigo" size="sm">
            404
          </Text>
          <Title order={2}>Page not found</Title>
          <Text c="dimmed">
            This route is not registered in the dashboard example.
          </Text>
          {onGoHome && (
            <Button onClick={onGoHome} mt="sm">
              Back to dashboard
            </Button>
          )}
        </Stack>
      </Card>
    </Center>
  )
}
