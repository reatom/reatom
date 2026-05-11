import { delay, http } from 'msw'

const repositoryApiUrl = 'https://api.github.com/repos/reatom/reatom'
const repositoryStarCount = 12345
const serviceUnavailableMessage = 'Service Unavailable'

function createGithubStarsResponse(): Response {
  return Response.json({ stargazers_count: repositoryStarCount })
}

function createServiceUnavailableResponse(): Response {
  return Response.json(
    { message: serviceUnavailableMessage },
    { status: 503, statusText: serviceUnavailableMessage },
  )
}

function neverResolve(): Promise<Response> {
  return new Promise(() => {})
}

export const githubStars = {
  default: http.get(repositoryApiUrl, async (): Promise<Response> => {
    await delay()
    return createGithubStarsResponse()
  }),
  error: http.get(repositoryApiUrl, (): Response => createServiceUnavailableResponse()),
  loading: http.get(repositoryApiUrl, (): Promise<Response> => neverResolve()),
}

export const reatomJsxXoHandlers = {
  githubStars: githubStars.default,
}
