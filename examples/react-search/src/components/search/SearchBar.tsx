import { TextInput, Group, ActionIcon, Select, Tooltip } from '@mantine/core';
import { useState } from 'react';
import { IconSearch, IconAdjustments } from '@tabler/icons-react';
import { wrap } from '@reatom/core';
import { reatomComponent } from '@reatom/react';
import { searchQuery, searchFilters } from '../../store';
import { FilterPanel } from './FilterPanel';

export const SearchBar = reatomComponent(() => {
  const query = searchQuery();
  const filters = searchFilters();
  const [filtersVisible, setFiltersVisible] = useState(false);

  return (
    <>
      <Group gap="xs">
        <TextInput
          placeholder="Search GitHub issues..."
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={wrap((e) => searchQuery(e.currentTarget.value))}
          style={{ flex: 1 }}
        />
        
        <Tooltip label="Advanced filters">
          <ActionIcon 
            variant="light" 
            onClick={() => setFiltersVisible(!filtersVisible)}
          >
            <IconAdjustments size={20} />
          </ActionIcon>
        </Tooltip>
        
        <Select
          placeholder="Sort by"
          data={[
            { value: 'created', label: 'Created date' },
            { value: 'updated', label: 'Updated date' },
            { value: 'comments', label: 'Comments' },
          ]}
          value={filters.sort}
          onChange={wrap((value) => searchFilters({ ...filters, sort: value as any }))}
          clearable
        />
        
        <Select
          placeholder="Order"
          data={[
            { value: 'desc', label: 'Descending' },
            { value: 'asc', label: 'Ascending' },
          ]}
          value={filters.direction}
          onChange={wrap((value) => searchFilters({ ...filters, direction: value as any }))}
        />
      </Group>
      
      {filtersVisible && <FilterPanel />}
    </>
  );
}, 'SearchBar');