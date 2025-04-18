import { Card, Text, Group, Badge, Avatar, Anchor, Stack } from '@mantine/core';
import { reatomComponent } from '@reatom/react';
import { Issue } from '../../api/types';
import { formatDate } from '../../utils/formatters';

interface IssueCardProps {
  issue: Issue;
}

export const IssueCard = reatomComponent(({ issue }: IssueCardProps) => {
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
        <Anchor href={issue.html_url} target="_blank" fw={700}>
          {issue.title}
        </Anchor>
        
        <Text size="sm" color="dimmed" lineClamp={2}>
          {issue.body}
        </Text>
        
        <Group mt="xs">
          {issue.labels.map((label) => (
            <Badge 
              key={label.id} 
              color={`#${label.color}`}
              variant="light"
            >
              {label.name}
            </Badge>
          ))}
        </Group>
      </Stack>
      
      <Group mt="md" justify="space-between">
        <Text size="xs" color="dimmed">
          {issue.repository?.full_name}
        </Text>
        <Text size="xs" color="dimmed">
          {formatDate(issue.created_at)}
        </Text>
      </Group>
    </Card>
  );
}, 'IssueCard');