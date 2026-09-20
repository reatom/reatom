export const fieldCss = `
  padding: 8px 12px;
  border: var(--border-width) var(--control-border-style) var(--border);
  border-radius: var(--radius-sm);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--focus-ring);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`
