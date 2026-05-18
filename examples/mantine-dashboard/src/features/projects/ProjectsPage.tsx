import {
  Badge,
  Button,
  Card,
  Group,
  Pagination,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { wrap } from '@reatom/core'
import { bindField, reatomComponent } from '@reatom/react'
import type { FormEvent } from 'react'

import type { Project, ProjectListResult, StatusFilter } from '../../shared/api/types'
import { statusFilters } from '../../shared/api/types'
import { formatCurrency, formatDate } from '../../shared/lib/formatters'
import { EmptyState } from '../../shared/ui/PageState'
import type { ProjectFilterForm } from './projectForms'
import {
  favoriteProjectIdsAtom,
  toggleProjectFavoriteAction,
} from './projectModel'
import { humanize, priorityColor, statusColor } from './projectUi'

export type ProjectsPageModel = {
  result: ProjectListResult
  filterForm: ProjectFilterForm
  setPage: (page: number) => unknown
  openProject: (projectId: string) => unknown
  goNew: () => unknown
}

const statusOptions = statusFilters.map((status) => ({
  value: status,
  label: status === 'all' ? 'All statuses' : humanize(status),
}))

const ProjectCard = reatomComponent(
  ({ project, openProject }: { project: Project; openProject: (projectId: string) => unknown }) => {
    const favoriteIds = favoriteProjectIdsAtom()
    const isFavorite = favoriteIds.includes(project.id)

    return (
      <Card withBorder radius="lg" p="lg">
        <Stack gap="md">
          <Group justify="space-between" align="start">
            <div>
              <Group gap="xs">
                <Title order={3}>{project.name}</Title>
                {isFavorite && <Badge color="yellow">Favorite</Badge>}
              </Group>
              <Text c="dimmed" size="sm" lineClamp={2}>
                {project.description}
              </Text>
            </div>
            <Badge color={statusColor[project.status]} variant="light">
              {humanize(project.status)}
            </Badge>
          </Group>

          <Progress value={project.progress} color={statusColor[project.status]} />

          <Group gap="xs">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="outline" color="gray">
                {tag}
              </Badge>
            ))}
          </Group>

          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Budget
              </Text>
              <Text fw={700}>{formatCurrency(project.budget)}</Text>
            </Stack>
            <Stack gap={0} align="end">
              <Text size="xs" c="dimmed">
                Due
              </Text>
              <Text fw={700}>{formatDate(project.dueDate)}</Text>
            </Stack>
          </Group>

          <Group justify="space-between">
            <Badge color={priorityColor[project.priority]} variant="dot">
              {humanize(project.priority)} priority
            </Badge>
            <Group gap="xs">
              <Button
                variant="subtle"
                onClick={wrap(() => toggleProjectFavoriteAction(project.id))}
              >
                {isFavorite ? 'Unfavorite' : 'Favorite'}
              </Button>
              <Button onClick={wrap(() => openProject(project.id))}>Open</Button>
            </Group>
          </Group>
        </Stack>
      </Card>
    )
  },
  'ProjectCard',
)

export const ProjectsPage = reatomComponent(
  ({ model, refreshing }: { model: ProjectsPageModel; refreshing?: boolean }) => {
    const { filterForm, result } = model
    const submitError = filterForm.submit.error()

    return (
      <Stack gap="lg">
        <Group justify="space-between" align="start">
          <div>
            <Title order={1}>Projects</Title>
            <Text c="dimmed">
              Route search params use a v1001 URL codec so loaders receive typed values.
            </Text>
          </div>
          <Button onClick={wrap(() => model.goNew())}>New project</Button>
        </Group>

        <Card withBorder radius="lg" p="lg">
          <form
            onSubmit={wrap((event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              filterForm.submit()
            })}
          >
            <Stack gap="md">
              <Group grow align="end">
                <TextInput label="Search" placeholder="Project, tag, outcome..." {...bindField(filterForm.fields.q)} />
                <Select
                  label="Status"
                  data={statusOptions}
                  allowDeselect={false}
                  value={filterForm.fields.status.value()}
                  error={filterForm.fields.status.validation().error}
                  onChange={wrap((value: string | null) => {
                    if (value) filterForm.fields.status.set(value as StatusFilter)
                  })}
                />
                <Button type="submit" loading={!filterForm.submit.ready()}>
                  Apply filters
                </Button>
              </Group>
              {submitError && (
                <Text c="red" size="sm">
                  {submitError.message}
                </Text>
              )}
            </Stack>
          </form>
        </Card>

        <Group justify="space-between">
          <Text c="dimmed">
            {result.total} project{result.total === 1 ? '' : 's'} found
          </Text>
          {refreshing && <Text c="dimmed">Refreshing...</Text>}
        </Group>

        {result.items.length === 0 ? (
          <EmptyState
            title="No projects match these filters"
            description="Try clearing the query or create a new project to see route loaders update."
            action={<Button onClick={wrap(() => model.goNew())}>Create project</Button>}
          />
        ) : (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            {result.items.map((project) => (
              <ProjectCard key={project.id} project={project} openProject={model.openProject} />
            ))}
          </SimpleGrid>
        )}

        {result.pages > 1 && (
          <Group justify="center">
            <Pagination
              total={result.pages}
              value={result.page}
              onChange={wrap((page: number) => model.setPage(page))}
            />
          </Group>
        )}
      </Stack>
    )
  },
  'ProjectsPage',
)
