export interface User {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  html_url: string;
  user: User;
  labels: Label[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  repository_url: string;
  repository?: {
    name: string;
    full_name: string;
    html_url: string;
  };
}

export interface IssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Issue[];
}

export type IssueState = 'open' | 'closed' | 'all';
export type IssueSort = 'created' | 'updated' | 'comments';
export type SortDirection = 'asc' | 'desc';

export interface SearchFilters {
  query: string;
  state?: IssueState;
  labels?: string[];
  language?: string;
  author?: string;
  assignee?: string;
  mentions?: string;
  sort?: IssueSort;
  direction?: SortDirection;
  since?: string; // ISO date string
  page: number;
  perPage: number;
}