import {
  Avatar,
  Badge,
  Card,
  Grid,
  Group,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { wrap } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

import type { DashboardSummary, Project } from '../../shared/api/types'
import { formatCurrency, formatDate, relativeTime } from '../../shared/lib/formatters'
import { priorityColor, statusColor } from '../projects/projectUi'

export type DashboardPageModel = {
  summary: DashboardSummary
  openProject: (projectId: string) => unknown
}

const MetricCard = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <Card withBorder radius="lg" p="lg" className="metric-card" pos="relative">
    <Stack gap={4}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Title order={2}>{value}</Title>
      <Text size="sm" c="dimmed">
        {hint}
      </Text>
    </Stack>
  </Card>
)

const ProjectRow = reatomComponent(
  ({ project, openProject }: { project: Project; openProject: (projectId: string) => unknown }) => (
    <UnstyledButton onClick={wrap(() => openProject(project.id))} w="100%">
      <Card withBorder radius="md" p="md">
        <Stack gap="xs">
          <Group justify="space-between" align="start">
            <div>
              <Text fw={700}>{project.name}</Text>
              <Text size="sm" c="dimmed" lineClamp={1}>
                {project.description}
              </Text>
            </div>
            <Badge color={statusColor[project.status]} variant="light">
              {project.status}
            </Badge>
          </Group>
          <Progress value={project.progress} color={statusColor[project.status]} />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Due {formatDate(project.dueDate)}
            </Text>
            <Badge color={priorityColor[project.priority]} variant="dot">
              {project.priority}
            </Badge>
          </Group>
        </Stack>
      </Card>
    </UnstyledButton>
  ),
  'DashboardProjectRow',
)

export const DashboardPage = reatomComponent(
  ({ model, refreshing }: { model: DashboardPageModel; refreshing?: boolean }) => {
    const { stats, projects, activity, team } = model.summary

    return (
      <Stack gap="lg">
        <Group justify="space-between" align="start">
          <div>
            <Title order={1}>Dashboard</Title>
            <Text c="dimmed">
              Private route loader with fake async fetches and stale-while-refresh UI.
            </Text>
          </div>
          {refreshing && <Text c="dimmed">Refreshing...</Text>}
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <MetricCard label="Active projects" value={String(stats.activeProjects)} hint="Currently in flight" />
          <MetricCard label="Blocked" value={String(stats.blockedProjects)} hint="Needs attention" />
          <MetricCard label="Completed" value={String(stats.completedProjects)} hint="Delivered work" />
          <MetricCard label="Budget in flight" value={formatCurrency(stats.budgetInFlight)} hint="Open portfolio" />
        </SimpleGrid>

        <Grid>
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Card withBorder radius="lg" p="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3}>Recent projects</Title>
                  <RingProgress
                    size={88}
                    thickness={8}
                    sections={[{ value: stats.averageProgress, color: 'indigo' }]}
                    label={
                      <Text ta="center" size="xs" fw={700}>
                        {stats.averageProgress}%
                      </Text>
                    }
                  />
                </Group>
                {projects.map((project) => (
                  <ProjectRow key={project.id} project={project} openProject={model.openProject} />
                ))}
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Stack gap="md">
              <Card withBorder radius="lg" p="lg">
                <Stack gap="sm">
                  <Title order={3}>Team</Title>
                  {team.map((user) => (
                    <Group key={user.id} gap="sm">
                      <Avatar color={user.avatarColor} radius="xl">
                        {user.name.slice(0, 1)}
                      </Avatar>
                      <div>
                        <Text fw={600}>{user.name}</Text>
                        <Text size="sm" c="dimmed">
                          {user.title}
                        </Text>
                      </div>
                    </Group>
                  ))}
                </Stack>
              </Card>

              <Card withBorder radius="lg" p="lg">
                <Stack gap="sm">
                  <Title order={3}>Activity</Title>
                  {activity.map((item) => (
                    <Stack key={item.id} gap={2}>
                      <Text size="sm">{item.message}</Text>
                      <Text size="xs" c="dimmed">
                        {relativeTime(item.createdAt)}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    )
  },
  'DashboardPage',
)
