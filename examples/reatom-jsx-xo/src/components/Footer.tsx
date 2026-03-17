import { computed, withAsyncData, wrap } from '@reatom/core'

const repositoryUrl = 'https://github.com/reatom/reatom'
const repositoryApiUrl = 'https://api.github.com/repos/reatom/reatom'
const sourceCodeUrl =
  'https://github.com/reatom/reatom/blob/v1000/examples/reatom-jsx-xo/src/App.tsx'

const repositoryStarCountFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const isRepositoryPayload = (
  value: unknown,
): value is { stargazers_count: number } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'stargazers_count' in value &&
    typeof value.stargazers_count === 'number' &&
    Number.isFinite(value.stargazers_count)
  )
}

const repositoryStarCountResource = computed(async () => {
  const response = await wrap(
    fetch(repositoryApiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    }),
  )

  if (!response.ok) throw new Error(response.statusText)

  const repositoryPayload: unknown = await wrap(response.json())
  if (!isRepositoryPayload(repositoryPayload)) return null

  return repositoryPayload.stargazers_count
}, 'footer.repositoryStarCount').extend(withAsyncData({ initState: null }))

export const Footer = () => {
  return (
    <div
      css={`
        color: rgba(255, 255, 255, 0.7);
        font-size: clamp(0.625rem, 1.5vmin, 0.6875rem);
        text-align: center;
        animation: fade-in 0.6s ease-out 0.4s both;
        padding-bottom: 2px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      `}
    >
      <span>
        Made with 💜 using{' '}
        <a
          css={`
            color: white;
            text-decoration: none;
          `}
          href="https://reatom.dev"
        >
          Reatom
        </a>
      </span>
      <a
        href={repositoryUrl}
        target="_blank"
        rel="noopener noreferrer"
        css={`
          color: rgba(255, 255, 255, 0.7);
          transition: color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          font-weight: 600;

          &:hover {
            color: rgba(255, 255, 255, 1);
          }
        `}
      >
        GitHub
        <span
          hidden={() => repositoryStarCountResource.data() === null}
          css={`
            font-variant-numeric: tabular-nums;
          `}
        >
          {() => {
            const repositoryStarCount = repositoryStarCountResource.data()
            return repositoryStarCount === null
              ? ''
              : `★ ${repositoryStarCountFormatter.format(repositoryStarCount)}`
          }}
        </span>
      </a>
      <a
        href={sourceCodeUrl}
        target="_blank"
        rel="noopener noreferrer"
        css={`
          color: rgba(255, 255, 255, 0.7);
          transition: color 0.2s;
          display: flex;
          align-items: center;
          line-height: 0;

          &:hover {
            color: rgba(255, 255, 255, 1);
          }
        `}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          css={`
            width: 16px;
          `}
        >
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            <path
              d="M13.717 8.88177C12.5881 8.56954 11.4119 8.56954 10.283 8.88177C10.2189 8.89949 10.155 8.91822 10.0912 8.93795L10.0894 8.93853C10.0564 8.94889 10.0205 8.94235 9.99324 8.92103V8.92103C9.95517 8.8914 9.91766 8.8627 9.8807 8.83491C8.69311 7.94193 8.07278 7.98181 7.91927 8.01161V8.01161C7.8946 8.0164 7.87585 8.03481 7.86732 8.05844C7.86516 8.06441 7.86303 8.07038 7.8609 8.07636C7.61639 8.76505 7.57904 9.52813 7.75277 10.2425C7.76289 10.2841 7.77371 10.3255 7.78525 10.3667C7.78601 10.3694 7.78677 10.3721 7.78753 10.3748C7.79754 10.4102 7.7902 10.4483 7.7678 10.4776V10.4776C7.75074 10.4998 7.73394 10.5223 7.71741 10.545C7.24479 11.1939 6.98907 12.0213 7.00036 12.8747C7.00036 16.3399 8.80396 17.1358 10.535 17.3711L10.5708 17.3758C11.5347 17.5199 12.4587 17.511 13.4195 17.3479L13.4438 17.345C15.1832 17.1339 16.9996 16.3587 16.9996 12.8747C17.0109 12.0213 16.7552 11.1939 16.2826 10.545C16.2674 10.5242 16.252 10.5035 16.2364 10.483C16.236 10.4825 16.2356 10.482 16.2352 10.4815C16.211 10.4498 16.203 10.4085 16.2138 10.3701V10.3701C16.2257 10.3277 16.2368 10.2852 16.2471 10.2425C16.421 9.52611 16.3815 8.76076 16.1329 8.07176C16.1313 8.06753 16.1298 8.06331 16.1283 8.05909C16.1195 8.03503 16.1004 8.01628 16.0752 8.01142V8.01142C15.921 7.98164 15.3041 7.94381 14.1193 8.83491C14.0848 8.86084 14.0499 8.88755 14.0144 8.91508V8.91508C13.9824 8.94011 13.9402 8.94762 13.9013 8.93566C13.9005 8.9354 13.8997 8.93514 13.8988 8.93488C13.8384 8.91627 13.7778 8.89857 13.717 8.88177Z"
              stroke="white"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
            <path
              d="M3 12C3 4.5885 4.5885 3 12 3C19.4115 3 21 4.5885 21 12C21 19.4115 19.4115 21 12 21C4.5885 21 3 19.4115 3 12Z"
              stroke="white"
              stroke-width="1"
            ></path>
          </g>
        </svg>
      </a>
    </div>
  )
}
