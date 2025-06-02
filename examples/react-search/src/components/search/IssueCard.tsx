import { Card, Text, Group, Badge, Avatar, Anchor, Stack } from '@mantine/core'
import { reatomComponent } from '@reatom/react'
import { Issue } from '../../api/types'
import { navigation } from '../../navigation/model'
import { wrap } from '@reatom/core'

interface IssueCardProps {
  issue: Issue
}

export const IssueCard = reatomComponent(({ issue }: IssueCardProps) => {
  // Define a memoized callback for handling the title click
  const handleTitleClick = wrap(() => {
    navigation.navigateToIssueDetail(String(issue.number))
  })

  return (
    <Card withBorder shadow="sm" p="md" radius="md" mb="sm">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group>
            <Avatar
              src={issue.user.avatar_url}
              alt={issue.user.login}
              radius="xl"
              size="sm"
            />
            <Text size="sm" fw={500}>
              {issue.user.login}
            </Text>
          </Group>
          <Badge color={issue.state === 'open' ? 'green' : 'red'}>
            {issue.state}
          </Badge>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="xs">
        {/* Make the title clickable for internal navigation */}
        <Anchor
          component="button"
          onClick={handleTitleClick} // Use the memoized callback
          fw={700}
          style={{ cursor: 'pointer' }}
          key={`issue-${issue.number}`} // Added key for stability
        >
          {issue.title}
        </Anchor>

        <Text size="sm" color="dimmed" lineClamp={2}>
          {issue.body}
        </Text>

        <Group mt="xs">
          {issue.labels.map((label) => (
            <Badge key={label.id} color={`#${label.color}`} variant="light">
              {label.name}
            </Badge>
          ))}
        </Group>
      </Stack>

      <Group mt="md" justify="space-between">
        <Text size="xs" color="dimmed">
          {issue.repository?.full_name}
        </Text>
        {/* Existing external GitHub link */}
        <Anchor href={issue.html_url} target="_blank" size="xs" color="dimmed">
          View on GitHub
        </Anchor>
      </Group>
    </Card>
  )
}, 'IssueCard')
