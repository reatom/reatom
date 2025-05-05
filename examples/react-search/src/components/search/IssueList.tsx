import { reatomComponent } from '@reatom/react'
import { IssueCard } from './IssueCard'
import { issuesResource } from './model'

export const IssueList = reatomComponent(() => {
  const items = issuesResource.data()?.items ?? []

  if (items.length === 0) {
    return <p>No issues found.</p>
  }

  return (
    <div>
      {items.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  )
}, 'IssueList')
