import { TextInput, Group, Select } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { reatomComponent } from '@reatom/react'
import { wrap } from '@reatom/core'
import { issueQuery, issueSort, issueDirection } from './model'
import { IssueSort, SortDirection } from '../../api'

export const SearchBar = reatomComponent(() => {
  const query = issueQuery()
  const sort = issueSort()
  const direction = issueDirection()

  return (
    <>
      <Group gap="xs">
        <TextInput
          placeholder="Search GitHub issues..."
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={wrap((e) => issueQuery.set(e.currentTarget.value))}
          style={{ flex: 1 }}
        />

        <Select
          placeholder="Sort by"
          data={[
            { value: 'created', label: 'Created date' },
            { value: 'updated', label: 'Updated date' },
            { value: 'comments', label: 'Comments' },
          ]}
          value={sort}
          onChange={wrap((value) => issueSort.set(value as IssueSort))}
          clearable
        />

        <Select
          placeholder="Order"
          data={[
            { value: 'desc', label: 'Descending' },
            { value: 'asc', label: 'Ascending' },
          ]}
          value={direction}
          onChange={wrap((value) => issueDirection.set(value as SortDirection))}
        />
      </Group>
    </>
  )
}, 'SearchBar')
