import React, { useEffect } from 'react'
import { reatomComponent } from '@reatom/react'
import { navigation } from '../../navigation/model'
import {
  Container,
  Title,
  Text,
  Button,
  Paper,
  Group,
  Loader,
} from '@mantine/core'
import { wrap } from '@reatom/core'

// Assuming there's a way to access issue data, perhaps from a search results atom
// import { searchResultsAtom } from '../search/model';

const IssuePage = reatomComponent(() => {
  const issueId = navigation.issueIdAtom()
  // const [searchResults] = useAtom(searchResultsAtom); // useAtom is not needed within reatomComponent

  // In a real application, you would fetch the issue details based on issueId
  // or find it in the searchResults if available.
  // For now, we'll use a placeholder or mock data.
  const issue = issueId
    ? {
        id: issueId,
        title: `Issue Title for ${issueId}`,
        description: `This is a detailed description for issue ${issueId}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
        status: 'Open',
        assignee: 'Unassigned',
        createdAt: '2023-10-27',
        updatedAt: '2023-10-27',
      }
    : null

  if (!issueId) {
    return (
      <Container>
        <Title order={2}>No issue selected</Title>
        <Button onClick={wrap(navigation.navigateToSearch)}>
          Back to Search
        </Button>
      </Container>
    )
  }

  if (!issue) {
    // This could be a loading state or an error state if fetching fails
    return (
      <Container>
        <Loader />
        <Text>Loading issue details...</Text>
        <Button onClick={wrap(navigation.navigateToSearch)}>
          Back to Search
        </Button>
      </Container>
    )
  }

  return (
    <Container>
      <Paper shadow="sm" p="md">
        <Group justify="space-between" mb="md">
          <Title order={2}>{issue.title}</Title>
          <Button onClick={wrap(navigation.navigateToSearch)}>
            Back to Search
          </Button>
        </Group>
        <Text size="sm" c="dimmed">
          Issue ID: {String(issue.id)}
        </Text>
        <Text size="sm" c="dimmed">
          Status: {issue.status}
        </Text>
        <Text size="sm" c="dimmed">
          Assignee: {issue.assignee}
        </Text>
        <Text size="sm" c="dimmed">
          Created At: {issue.createdAt}
        </Text>
        <Text size="sm" c="dimmed">
          Updated At: {issue.updatedAt}
        </Text>
        <Text mt="md">{issue.description}</Text>
      </Paper>
    </Container>
  )
}, 'IssuePage')

export default IssuePage
