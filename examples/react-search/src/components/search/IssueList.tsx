import { reatomComponent } from '@reatom/react';
import { Issue } from '../../api/types';
import { IssueCard } from './IssueCard';

interface IssueListProps {
  issues: Issue[];
}

export const IssueList = reatomComponent(({ issues }: IssueListProps) => {
  if (issues.length === 0) {
    return <p>No issues found.</p>;
  }

  return (
    <div>
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}, 'IssueList');