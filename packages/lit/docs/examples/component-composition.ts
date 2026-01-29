/**
 * Component Composition
 *
 * Compose multiple ReatomLitElement components together
 *
 * @file Component Composition
 */

import { atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// Shared state
const theme = atom<'light' | 'dark'>('light', 'theme')
const sidebarOpen = atom(true, 'sidebarOpen')

// Header component
export class Header extends ReatomLitElement {
  private handleToggleTheme = () => {
    theme.set((t) => (t === 'light' ? 'dark' : 'light'))
  }

  override render() {
    const currentTheme = watch(theme)

    return html`
      <header class="header theme-${currentTheme}">
        <h1>My App</h1>
        <button @click=${this.handleToggleTheme}>
          Toggle Theme (${currentTheme})
        </button>
      </header>
    `
  }
}

customElements.define('app-header', Header)

// Sidebar component
export class Sidebar extends ReatomLitElement {
  private handleClose = () => {
    sidebarOpen.set(false)
  }

  override render() {
    return html`
      <aside class="sidebar" ?open=${watch(sidebarOpen)}>
        <button @click=${this.handleClose}>Close</button>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
      </aside>
    `
  }
}

customElements.define('app-sidebar', Sidebar)

// Main content component
export class MainContent extends ReatomLitElement {
  private handleOpenSidebar = () => {
    sidebarOpen.set(true)
  }

  override render() {
    return html`
      <main class="main">
        <button @click=${this.handleOpenSidebar}>Open Sidebar</button>
        <p>Main content goes here...</p>
      </main>
    `
  }
}

customElements.define('app-main', MainContent)

// App component that composes all pieces
export class App extends ReatomLitElement {
  override render() {
    const currentTheme = watch(theme)

    return html`
      <div class="app theme-${currentTheme}">
        <app-header></app-header>
        <app-sidebar></app-sidebar>
        <app-main></app-main>
      </div>
    `
  }
}

customElements.define('my-app', App)

/**
 * This example demonstrates component composition:
 *
 * - Header component with theme toggle
 * - Sidebar component with open/close state
 * - Main content component
 * - App component that composes all pieces
 *
 * Key benefits of composition:
 *
 * **Reusability** - each component can be used independently
 *
 * - Header, Sidebar, and MainContent are all separate, reusable components
 * - You can use them in different contexts
 *
 * **Shared state** - components communicate through shared atoms
 *
 * - Theme atom is shared across all components
 * - SidebarOpen state coordinates between components
 * - No need for props drilling or event emitters
 *
 * **Separation of concerns** - each component has a single responsibility
 *
 * - Header: navigation and theme
 * - Sidebar: navigation panel
 * - Main: content display
 *
 * **Easy testing** - components can be tested independently
 *
 * - Each component can be tested in isolation
 * - Mock atoms for testing without affecting other components
 */
