import { delay, http, HttpResponse } from 'msw'

const repositoryApiUrl = 'https://api.github.com/repos/reatom/reatom'
const repositoryStarCount = 12345
const serviceUnavailableMessage = 'Service Unavailable'

function createGithubStarsResponse() {
  return HttpResponse.json({ stargazers_count: repositoryStarCount })
}

function createServiceUnavailableResponse() {
  return HttpResponse.json(
    { message: serviceUnavailableMessage },
    { status: 503, statusText: serviceUnavailableMessage },
  )
}

function neverResolve(): Promise<HttpResponse> {
  return new Promise(() => {})
}

export const githubStars = {
  default: http.get(repositoryApiUrl, async () => {
    await delay()
    return createGithubStarsResponse()
  }),
  error: http.get(repositoryApiUrl, () => createServiceUnavailableResponse()),
  loading: http.get(repositoryApiUrl, () => neverResolve()),
}

export const reatomJsxXoHandlers = {
  githubStars: githubStars.default,
}
