import { createFileRoute } from '@tanstack/react-router'
import { reatomComponent } from '@reatom/react'

import { searchQueryAtom, searchResource } from '../model'

const HomePage = reatomComponent(() => {
  const query = searchQueryAtom()
  const searchResult = searchResource.data()

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">TanStack Start SSR without RSC</p>
        <h1>Reatom cache is ready in the first HTML response.</h1>
        <p className="lead">
          The server reads the URL search param, resolves async Reatom data,
          serializes the cache, and hydrates the same frame on the client.
        </p>
        <form action="/" method="get" className="search">
          <label htmlFor="query">Search query</label>
          <div>
            <input
              id="query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="reatom"
            />
            <button type="submit">Render with SSR</button>
          </div>
        </form>
      </div>

      <div className="card" data-testid="ssr-result">
        <span>Resolved query</span>
        <strong>{searchResult.query}</strong>
        <ul>
          {searchResult.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}, 'HomePage')

export const Route = createFileRoute('/')({
  component: HomePage,
  ssr: true,
})
