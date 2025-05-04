import mermaid from 'mermaid'

// TODO integrate mermaid as astro plugin instead

mermaid.initialize({
  theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'pastel',
})

export { mermaid }
