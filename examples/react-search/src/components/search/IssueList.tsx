import { reatomComponent } from '@reatom/react'
import { IssueCard } from './IssueCard'
import { issuesResponse } from './model'

export const IssueList = reatomComponent(() => {
  const { items } = issuesResponse()

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
