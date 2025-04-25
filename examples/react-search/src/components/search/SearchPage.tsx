import { Suspense } from 'react'
import { Container, Title, Text, Stack, LoadingOverlay } from '@mantine/core'
import { reatomComponent } from '@reatom/react'
import { SearchBar } from './SearchBar'
import { IssueList } from './IssueList'
import { Pagination } from './Pagination'
import {
  isIssuesLoading,
  issuesResource,
  issuesError,
  issueQuery,
} from './model'

export const SearchPage = reatomComponent(() => {
  const query = issueQuery()

  const issuesData = issuesResource.data()

  const total_count = issuesData?.total_count ?? 0

  return (
    <Container size="xl">
      <Title order={2} mb="lg">
        GitHub Issues Search
      </Title>

      <SearchBar />

      <div style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={isIssuesLoading() && !!query} />

        {issuesError() && (
          <Text c="red" mt="md">
            Error: {issuesError()?.message || 'Unknown error'}
          </Text>
        )}

        {!isIssuesLoading() && query && (
          <Stack mt="lg" gap="md">
            <Text>
              Found {total_count.toLocaleString()} issues for "{query}"
            </Text>

            <Suspense fallback={<LoadingOverlay visible />}>
              <IssueList />
            </Suspense>

            <Pagination />
          </Stack>
        )}

        {!query && (
          <Text c="dimmed" ta="center" mt="xl">
            Enter a search query to find GitHub issues
          </Text>
        )}
      </div>
    </Container>
  )
}, 'SearchPage')
