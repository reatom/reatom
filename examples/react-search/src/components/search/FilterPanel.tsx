import { Paper, Group, Chip, MultiSelect, Select, TextInput } from '@mantine/core';
import { wrap } from '@reatom/core';
import { reatomComponent } from '@reatom/react';
import { searchFilters } from '../../store';
import { labelsDataAtom, languagesDataAtom } from '../../hooks'; // Updated import
import React from 'react';
import { atom } from '@reatom/core';

const selectedLabelsAtom = atom<string[]>([], 'selectedLabels');
const selectedLanguageAtom = atom<string | null>(null, 'selectedLanguage');

interface Label {
  id: number;
  name: string;
  color: string;
}

export const FilterPanel = reatomComponent(() => {
  const filters = searchFilters();
  // const labels = useLabels(); // Remove this line
  // const languages = useLanguages(); // Remove this line
  const selectedLabels = selectedLabelsAtom();
  const selectedLanguage = selectedLanguageAtom();

  const labelsData = labelsDataAtom().map(label => ({ value: label.name, label: label.name, color: `#${label.color}` }));
  const languagesData = languagesDataAtom().map(lang => ({ value: lang, label: lang }));

  return (
    <Paper p="md" withBorder mt="xs">
      <Group mb="md">
        <Chip.Group
          multiple={false}
          value={filters.state || 'all'}
          onChange={wrap((value) => searchFilters({ ...filters, state: value as any }))}
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
          data={labelsData}
          value={selectedLabels}
          onChange={wrap((value) => {
            selectedLabelsAtom(value);
            searchFilters({ ...filters, labels: value });
          })}
        />

        <Select
          label="Language"
          placeholder="Select language"
          data={languagesData}
          value={selectedLanguage}
          onChange={wrap((value) => {
            selectedLanguageAtom(value);
            searchFilters({ ...filters, language: value as any });
          })}
        />
      </Group>

      <Group grow>
        <TextInput
          label="Author"
          placeholder="GitHub username"
          value={filters.author || ''}
          onChange={wrap((e) => searchFilters({ ...filters, author: e.currentTarget.value }))}
        />

        <TextInput
          label="Assignee"
          placeholder="GitHub username"
          value={filters.assignee || ''}
          onChange={wrap((e) => searchFilters({ ...filters, assignee: e.currentTarget.value }))}
        />
      </Group>
    </Paper>
  );
}, 'FilterPanel');