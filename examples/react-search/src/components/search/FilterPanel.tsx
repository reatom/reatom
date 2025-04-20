import {
  Paper,
  Group,
  Chip,
  MultiSelect,
  Select,
  TextInput,
} from '@mantine/core'
import { reatomComponent } from '@reatom/react'
import { issuesFilters } from './model'
import { IssueState, mockLabels, mockLanguages } from '../../api'

export const FilterPanel = reatomComponent(() => {
  const filters = issuesFilters()

  return (
    <Paper p="md" withBorder mt="xs">
      <Group mb="md">
        <Chip.Group
          multiple={false}
          value={filters.state || 'all'}
          onChange={(value) =>
            issuesFilters({ ...filters, state: value as IssueState })
          }
        >
          <Group>
            <Chip value="all">All</Chip>
            <Chip value="open">Open</Chip>
            <Chip value="closed">Closed</Chip>
          </Group>
        </Chip.Group>
      </Group>

      <Group grow mb="md">
        <MultiSelect
          label="Labels"
          placeholder="Select labels"
          data={mockLabels.map(({ name }) => ({ value: name, label: name }))}
          value={filters.labels || []}
          onChange={(value) => {
            issuesFilters({ ...filters, labels: value })
          }}
        />

        <Select
          label="Language"
          placeholder="Select language"
          data={mockLanguages.map((lang) => ({ value: lang, label: lang }))}
          value={filters.language || ''}
          onChange={(value) =>
            issuesFilters({ ...filters, language: value || '' })
          }
        />
      </Group>

      <Group grow>
        <TextInput
          label="Author"
          placeholder="GitHub username"
          value={filters.author || ''}
          onChange={(e) =>
            issuesFilters({ ...filters, author: e.currentTarget.value })
          }
        />

        <TextInput
          label="Assignee"
          placeholder="GitHub username"
          value={filters.assignee || ''}
          onChange={(e) =>
            issuesFilters({ ...filters, assignee: e.currentTarget.value })
          }
        />
      </Group>
    </Paper>
  )
}, 'FilterPanel')
