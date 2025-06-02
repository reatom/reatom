import {
  Paper,
  Group,
  Chip,
  MultiSelect,
  Select,
  TextInput,
} from '@mantine/core'
import { reatomComponent } from '@reatom/react'
import { wrap } from '@reatom/core'
import {
  issueState,
  issueLabels,
  issueLanguage,
  issueAuthor,
  issueAssignee,
} from './model'
import { IssueState, mockLabels, mockLanguages } from '../../api'

export const FilterPanel = reatomComponent(() => {
  const state = issueState()
  const labels = issueLabels()
  const language = issueLanguage()
  const author = issueAuthor()
  const assignee = issueAssignee()

  return (
    <Paper p="md" withBorder mt="xs">
      <Group mb="md">
        <Chip.Group
          multiple={false}
          value={state || 'all'}
          onChange={wrap((value) => issueState.set(value as IssueState))}
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
          value={labels || []}
          onChange={wrap((value) => issueLabels.set(value))}
        />

        <Select
          label="Language"
          placeholder="Select language"
          data={mockLanguages.map((lang) => ({ value: lang, label: lang }))}
          value={language || ''}
          onChange={wrap((value) => issueLanguage.set(value || ''))}
        />
      </Group>

      <Group grow>
        <TextInput
          label="Author"
          placeholder="GitHub username"
          value={author || ''}
          onChange={wrap((e) => issueAuthor.set(e.currentTarget.value))}
        />

        <TextInput
          label="Assignee"
          placeholder="GitHub username"
          value={assignee || ''}
          onChange={wrap((e) => issueAssignee.set(e.currentTarget.value))}
        />
      </Group>
    </Paper>
  )
}, 'FilterPanel')
