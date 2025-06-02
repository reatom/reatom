import {
  Group,
  Pagination as MantinePagination,
  Select,
  Text,
} from '@mantine/core'
import { reatomComponent } from '@reatom/react'
import { wrap } from '@reatom/core'
import { isIssuesLoading, issuesResource, issuePage, issuePerPage } from './model'

export const Pagination = reatomComponent(() => {
  const total_count = issuesResource.data()?.total_count ?? 0
  const perPage = issuePerPage() ?? 10
  const currentPage = issuePage() ?? 1

  const totalPages = Math.min(Math.ceil(total_count / perPage), 100) // GitHub API limit

  if (isIssuesLoading() || total_count === 0) return null

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
          onChange={wrap((value) => {
            issuePerPage.set(parseInt(value || '10'))
            issuePage.set(1) // Reset to first page when changing items per page
          })}
          style={{ width: 80 }}
        />

        <MantinePagination
          total={totalPages}
          value={currentPage}
          onChange={wrap((page) => issuePage.set(page))}
        />
      </Group>
    </Group>
  )
}, 'Pagination')
