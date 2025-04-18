import { atom, computed, withAsyncData } from '@reatom/core';
import { reatomComponent } from '@reatom/react';
import { fetchPopularLabels, fetchPopularLanguages } from '../api/github';
import React from 'react';

interface Label {
  id: number;
  name: string;
  color: string;
}

const labelsAtom = computed(async () => {
  return await fetchPopularLabels();
}, 'labels').extend(withAsyncData(null, []));

const languagesAtom = computed(async () => {
  return await fetchPopularLanguages();
}, 'languages').extend(withAsyncData(null, []));

export const labelsDataAtom = atom<Label[]>([], 'labelsData');
export const languagesDataAtom = atom<string[]>([], 'languagesData');

labelsAtom.data.subscribe((data) => {
  if (data) {
    labelsDataAtom(data);
  }
});

languagesAtom.data.subscribe((data) => {
  if (data) {
    languagesDataAtom(data);
  }
});

export const Labels = reatomComponent(() => {
  const labels = labelsDataAtom();
  return (
    React.createElement(React.Fragment, null,
      labels.map((label: Label) =>
        React.createElement("span", { key: label.id }, label.name)
      )
    )
  );
});

export const Languages = reatomComponent(() => {
  const languages = languagesDataAtom();
  return (
    React.createElement(React.Fragment, null,
      languages.map((language: string) =>
        React.createElement("span", { key: language }, language)
      )
    )
  );
});

export * from './useDebounce';