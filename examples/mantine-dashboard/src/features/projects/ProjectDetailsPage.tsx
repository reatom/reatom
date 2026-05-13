import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Progress,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import type { Atom } from '@reatom/core'
import { wrap } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

import type { Project, ProjectStatus } from '../../shared/api/types'
import { projectStatuses } from '../../shared/api/types'
import { formatCurrency, formatDate } from '../../shared/lib/formatters'
import {
  favoriteProjectIdsAtom,
  toggleProjectFavoriteAction,
} from './projectModel'
import { humanize, priorityColor, statusColor } from './projectUi'

export type ProjectDetailsPageModel = {
  projectAtom: Atom<Project>
  updateStatus: ((status: ProjectStatus) => unknown) & {
    status: () => { isPending: boolean }
    error: () => Error | undefined
  }
  backToProjects: () => unknown
}

const statusOptions = projectStatuses.map((status) => ({
  value: status,
  label: humanize(status),
}))

export const ProjectDetailsPage = reatomComponent(
  ({ model, refreshing }: { model: ProjectDetailsPageModel; refreshing?: boolean }) => {
    const project = model.projectAtom()
    const mutationStatus = model.updateStatus.status()
    const mutationError = model.updateStatus.error()
    const isFavorite = favoriteProjectIdsAtom().includes(project.id)

    return (
      <Stack gap="lg">
        <Group justify="space-between" align="start">
          <div>
            <Button variant="subtle" mb="sm" onClick={wrap(() => model.backToProjects())}>
              ← Back to projects
            </Button>
            <Group gap="xs">
              <Title order={1}>{project.name}</Title>
              <Badge color={statusColor[project.status]} variant="light">
                {humanize(project.status)}
              </Badge>
            </Group>
            <Text c="dimmed" maw={760}>
              {project.description}
            </Text>
          </div>
          {refreshing && <Text c="dimmed">Refreshing...</Text>}
        </Group>

        {mutationError && (
          <Alert color="red" title="Optimistic update rolled back">
            {mutationError.message}
          </Alert>
        )}

        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card withBorder radius="lg" p="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3}>Delivery health</Title>
                  <Badge color={priorityColor[project.priority]} variant="dot">
                    {humanize(project.priority)} priority
                  </Badge>
                </Group>
                <Progress
                  value={project.progress}
                  color={statusColor[project.status]}
                  animated={mutationStatus.isPending}
                />
                <Group justify="space-between">
                  <Text c="dimmed">Progress</Text>
                  <Text fw={700}>{project.progress}%</Text>
                </Group>
                <Select
                  label="Status"
                  description="This action updates local state optimistically and rolls back on fake failures."
                  data={statusOptions}
                  allowDeselect={false}
                  value={project.status}
                  disabled={mutationStatus.isPending}
                  onChange={wrap((value: string | null) => {
                    if (value) model.updateStatus(value as ProjectStatus)
                  })}
                />
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="lg" p="lg">
              <Stack gap="md">
                <Title order={3}>Project facts</Title>
                <Group justify="space-between">
                  <Text c="dimmed">Budget</Text>
                  <Text fw={700}>{formatCurrency(project.budget)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed">Due</Text>
                  <Text fw={700}>{formatDate(project.dueDate)}</Text>
                </Group>
                <Group gap="xs">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="outline" color="gray">
                      {tag}
                    </Badge>
                  ))}
                </Group>
                <Button
                  variant={isFavorite ? 'filled' : 'light'}
                  color="yellow"
                  onClick={wrap(() => toggleProjectFavoriteAction(project.id))}
                >
                  {isFavorite ? 'Favorite project' : 'Mark as favorite'}
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    )
  },
  'ProjectDetailsPage',
)
