import { Container, Title, Text, Stack, LoadingOverlay } from '@mantine/core';
import { reatomComponent } from '@reatom/react';
import { SearchBar } from './SearchBar';
import { IssueList } from './IssueList';
import { Pagination } from './Pagination';
import { issues } from '../../store/issues';
import { searchQuery } from '../../store/search';

export const SearchPage = reatomComponent(() => {
  const query = searchQuery();
  const { data, ready, error } = issues;
  const issuesData = data();
  
  return (
    <Container size="xl">
      <Title order={2} mb="lg">GitHub Issues Search</Title>
      
      <SearchBar />
      
      <div style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={!ready() && !!query} />
        
        {error() && (
          <Text color="red" mt="md">
            Error: {error()?.message || 'Unknown error'}
          </Text>
        )}
        
        {ready() && query && (
          <Stack mt="lg" gap="md">
            <Text>
              Found {issuesData.total_count.toLocaleString()} issues for "{query}"
            </Text>
            
            <IssueList issues={issuesData.items} />
            
            <Pagination />
          </Stack>
        )}
        
        {!query && (
          <Text color="dimmed" ta="center" mt="xl">
            Enter a search query to find GitHub issues
          </Text>
        )}
      </div>
    </Container>
  );
}, 'SearchPage');