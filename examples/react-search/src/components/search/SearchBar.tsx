import { TextInput, Group, Select } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { reatomComponent } from '@reatom/react'
import { issuesFilters } from './model'
import { IssueSort, SortDirection } from '../../api'

export const SearchBar = reatomComponent(() => {
  const filters = issuesFilters()

  return (
    <>
      <Group gap="xs">
        <TextInput
          placeholder="Search GitHub issues..."
          leftSection={<IconSearch size={16} />}
          value={filters.query}
          onChange={(e) =>
            issuesFilters((state) => ({
              ...state,
              query: e.currentTarget.value,
            }))
          }
          style={{ flex: 1 }}
        />

        <Select
          placeholder="Sort by"
          data={[
            { value: 'created', label: 'Created date' },
            { value: 'updated', label: 'Updated date' },
            { value: 'comments', label: 'Comments' },
          ]}
          value={filters.sort}
          onChange={(value) =>
            issuesFilters({ ...filters, sort: value as IssueSort })
          }
          clearable
        />

        <Select
          placeholder="Order"
          data={[
            { value: 'desc', label: 'Descending' },
            { value: 'asc', label: 'Ascending' },
          ]}
          value={filters.direction}
          onChange={(value) =>
            issuesFilters({ ...filters, direction: value as SortDirection })
          }
        />
      </Group>
    </>
  )
}, 'SearchBar')
