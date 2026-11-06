import { Button, Checkbox, Group, Paper, Stack, Text } from '@mantine/core'
import { wrap } from '@reatom/core'
import type {
  GdprConsentSnapshot,
  ReatomGDPR,
} from '@reatom/opentelemetry'
import { reatomComponent } from '@reatom/react'

import { consent } from '../../setup'

type ConsentBannerProps = {
  model?: {
    fields: Pick<ReatomGDPR<{ analytics: boolean }>['fields'], 'analytics'>
    snapshot: () => GdprConsentSnapshot<{ analytics: boolean }> | null
    submit: () => Promise<void>
  }
}

export const ConsentBanner = reatomComponent(
  ({ model = consent }: ConsentBannerProps) => {
    const snapshot = model.snapshot()
    const analyticsDraft = model.fields.analytics
    const analyticsGranted = snapshot?.categories.analytics === true

    const savePreferences = wrap(() => void model.submit())
    const withdrawAnalytics = wrap(() => {
      analyticsDraft.change(false)
      void model.submit()
    })

    if (analyticsGranted) {
      return (
        <Paper
          data-testid="consent-banner"
          shadow="md"
          p="md"
          withBorder
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            zIndex: 200,
            maxWidth: 420,
          }}
        >
          <Stack gap="sm">
            <Text size="sm" fw={600}>
              Privacy preferences
            </Text>
            <Text size="xs" c="dimmed">
              Analytics is on. Withdraw stops analytics collection. New events
              will not carry a visitor id.
            </Text>
            <Group justify="flex-end">
              <Button
                data-testid="consent-withdraw"
                size="xs"
                variant="default"
                onClick={withdrawAnalytics}
              >
                Withdraw analytics
              </Button>
            </Group>
          </Stack>
        </Paper>
      )
    }

    return (
      <Paper
        data-testid="consent-banner"
        shadow="md"
        p="md"
        withBorder
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 200,
          maxWidth: 420,
        }}
      >
        <Stack gap="sm">
          <Text size="sm" fw={600}>
            Privacy preferences
          </Text>
          <Text size="xs" c="dimmed">
            {snapshot === null
              ? 'Analytics stay off until you save.'
              : 'Analytics is off. Save with Analytics checked to grant again.'}
          </Text>
          <Checkbox
            data-testid="consent-analytics"
            label="Analytics"
            checked={analyticsDraft()}
            onChange={wrap((event) =>
              analyticsDraft.change(event.currentTarget.checked),
            )}
          />
          <Group justify="flex-end">
            <Button
              data-testid="consent-save"
              size="xs"
              onClick={savePreferences}
            >
              Save preferences
            </Button>
          </Group>
        </Stack>
      </Paper>
    )
  },
  'ConsentBanner',
)
