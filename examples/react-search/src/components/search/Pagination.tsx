import { Group, Pagination as MantinePagination, Select, Text } from '@mantine/core';
import { wrap } from '@reatom/core';
import { reatomComponent } from '@reatom/react';
import { searchFilters } from '../../store';
import { issues } from '../../store/issues';

export const Pagination = reatomComponent(() => {
  const filters = searchFilters();
  const { data, ready } = issues;
  const totalCount = data()?.total_count || 0;
  const perPage = filters.perPage ?? 10;
  const currentPage = filters.page ?? 1;
  
  const totalPages = Math.min(Math.ceil(totalCount / perPage), 100); // GitHub API limit
  
  if (!ready() || totalCount === 0) return null;
  
  return (
    <Group justify="space-between" mt="xl">
      <Text size="sm">
        Showing {(currentPage - 1) * perPage + 1}-
        {Math.min(currentPage * perPage, totalCount)} of {totalCount} results
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
          onChange={wrap((value) => searchFilters({ 
            ...filters, 
            perPage: parseInt(value || '10'),
            page: 1 // Reset to first page when changing items per page
          }))}
          style={{ width: 80 }}
        />
        
        <MantinePagination
          total={totalPages}
          value={currentPage}
          onChange={wrap((page) => searchFilters({ ...filters, page }))}
        />
      </Group>
    </Group>
  );
}, 'Pagination');