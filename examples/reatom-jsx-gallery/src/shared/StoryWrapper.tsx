import { themeMode, themePack } from '../model'
import { activeThemeVariables, GlobalStyles } from '../theme'

export const StoryWrapper = ({ children }: { children: unknown }) => (
  <div
    attr:data-theme-pack={themePack}
    attr:data-theme-mode={themeMode}
    style={() => activeThemeVariables()}
    css={`
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 20px;
    `}
  >
    <GlobalStyles />
    {children}
  </div>
)
