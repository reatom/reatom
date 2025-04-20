import {
  Group,
  Pagination as MantinePagination,
  Select,
  Text,
} from '@mantine/core'
import { reatomComponent } from '@reatom/react'
import { isIssuesLoading, issuesFilters, issuesResponse } from './model'

export const Pagination = reatomComponent(() => {
  const filters = issuesFilters()
  const { total_count } = issuesResponse()
  const perPage = filters.perPage ?? 10
  const currentPage = filters.page ?? 1

  const totalPages = Math.min(Math.ceil(total_count / perPage), 100) // GitHub API limit

  if (!isIssuesLoading() || total_count === 0) return null

  return (
    <Group justify="space-between" mt="xl">
      <Text size="sm">
        Showing {(currentPage - 1) * perPage + 1}-
        {Math.min(currentPage * perPage, total_count)} of {total_count} results
      </Text>

      <Group>
        <Select
          label="Per page"
          data={[
            { value: '10', label: '10' },
            { value: '20', label: '20' },
            { value: '50', label: '50' },
          ]}
          value={perPage.toString()}
          onChange={(value) =>
            issuesFilters({
              ...filters,
              perPage: parseInt(value || '10'),
              page: 1, // Reset to first page when changing items per page
            })
          }
          style={{ width: 80 }}
        />

        <MantinePagination
          total={totalPages}
          value={currentPage}
          onChange={(page) => issuesFilters({ ...filters, page })}
        />
      </Group>
    </Group>
  )
}, 'Pagination')
