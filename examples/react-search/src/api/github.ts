import { SearchFilters, IssuesResponse, Label } from './types';

export const searchIssues = async (
  filters: SearchFilters,
  signal?: AbortSignal
): Promise<IssuesResponse> => {
  // Build query string
  let q = filters.query;
  
  if (filters.state) {
    q += ` state:${filters.state}`;
  }
  
  if (filters.labels && filters.labels.length > 0) {
    filters.labels.forEach(label => {
      q += ` label:"${label}"`;
    });
  }
  
  if (filters.language) {
    q += ` language:${filters.language}`;
  }
  
  if (filters.author) {
    q += ` author:${filters.author}`;
  }
  
  if (filters.assignee) {
    q += ` assignee:${filters.assignee}`;
  }
  
  if (filters.mentions) {
    q += ` mentions:${filters.mentions}`;
  }
  
  // Build URL with query parameters
  const params = new URLSearchParams({
    q,
    page: filters.page.toString(),
    per_page: filters.perPage.toString(),
  });
  
  if (filters.sort) {
    params.append('sort', filters.sort);
  }
  
  if (filters.direction) {
    params.append('order', filters.direction);
  }
  
  const url = `https://api.github.com/search/issues?${params.toString()}`;
  
  // Fetch data
  const response = await fetch(url, { 
    signal,
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!response.ok) {
    const error = new Error(`HTTP Error: ${response.statusText}`);
    const meta = await response.json().catch(() => ({}));
    throw Object.assign(error, meta);
  }
  
  const data = await response.json();
  
  // Enhance issues with repository information
  const enhancedItems = await Promise.all(
    data.items.map(async (issue: any) => {
      // Extract repo info from repository_url
      const repoUrlParts = issue.repository_url.split('/');
      const repoOwner = repoUrlParts[repoUrlParts.length - 2];
      const repoName = repoUrlParts[repoUrlParts.length - 1];
      
      return {
        ...issue,
        repository: {
          name: repoName,
          full_name: `${repoOwner}/${repoName}`,
          html_url: `https://github.com/${repoOwner}/${repoName}`
        }
      };
    })
  );
  
  return {
    ...data,
    items: enhancedItems
  };
};

// Additional API functions for fetching labels, languages, etc.
export const fetchPopularLabels = async (): Promise<Label[]> => {
  // This could be a curated list or fetched from GitHub API
  return [
    { id: 1, name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
    { id: 2, name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
    { id: 3, name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
    { id: 4, name: 'good first issue', color: '7057ff', description: 'Good for newcomers' },
    { id: 5, name: 'help wanted', color: '008672', description: 'Extra attention is needed' },
  ];
};

export const fetchPopularLanguages = async (): Promise<string[]> => {
  // This could be a curated list or fetched from GitHub API
  return [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'Go',
    'Rust',
    'C#',
    'C++',
    'PHP',
    'Ruby',
  ];
};