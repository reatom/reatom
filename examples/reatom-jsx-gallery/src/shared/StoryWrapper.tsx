import { theme } from '../model'
import { GlobalStyles } from '../theme'

export const StoryWrapper = ({ children }: { children: unknown }) => (
  <div
    attr:data-theme={theme}
    css={`
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 20px;

      &[data-theme='dark'] {
        --bg-primary: #1a1a2e;
        --bg-secondary: #16213e;
        --bg-tertiary: #0f3460;
        --accent: #e94560;
        --accent-hover: #ff6b81;
        --text-primary: #eeeeee;
        --text-secondary: #a0a0b0;
        --text-muted: #666680;
        --card-bg: rgba(255, 255, 255, 0.05);
        --card-border: rgba(255, 255, 255, 0.08);
        --border: rgba(255, 255, 255, 0.1);
        --input-bg: rgba(255, 255, 255, 0.08);
        --input-border: rgba(255, 255, 255, 0.12);
        --hover-bg: rgba(255, 255, 255, 0.1);
      }

      &[data-theme='light'] {
        --bg-primary: #f0f2f5;
        --bg-secondary: #ffffff;
        --bg-tertiary: #e4e6eb;
        --accent: #e94560;
        --accent-hover: #d63851;
        --text-primary: #1a1a2e;
        --text-secondary: #555570;
        --text-muted: #888898;
        --card-bg: #ffffff;
        --card-border: rgba(0, 0, 0, 0.08);
        --border: rgba(0, 0, 0, 0.1);
        --input-bg: rgba(0, 0, 0, 0.04);
        --input-border: rgba(0, 0, 0, 0.1);
        --hover-bg: rgba(0, 0, 0, 0.05);
      }
    `}
  >
    <GlobalStyles />
    {children}
  </div>
)
