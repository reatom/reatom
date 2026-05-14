# Landing Page Components

This directory contains components specific to the landing page of the Reatom documentation site.

## Architecture Overview

### Code Highlighting Components

- **`ShikiCodeBlock.astro`**: Custom syntax-highlighted code blocks with interactive annotations
- **`CodeExample.astro`**: Wrapper component that manages multiple code examples in a tabbed interface
- **`code-examples.ts`**: Configuration and content for the code examples

### Key Improvements Made

#### 1. Fixed Namespace Conflicts ✅

**Problem**: Multiple `ShikiCodeBlock` components on the same page shared the same tooltip ID (`code-tooltip`), causing conflicts.

**Solution**:

- Generated unique component IDs using `Math.random().toString(36).slice(2, 9)`
- Added `data-component-id` attributes to scope each component instance
- Created unique tooltip IDs: `code-tooltip-${componentId}`

#### 2. Enhanced Tooltip Functionality ✅

**Problem**: Tooltips only worked for elements present at initial page load and didn't work after content toggling.

**Solution**:

- Implemented event delegation on the component wrapper
- Added `MutationObserver` to detect dynamically added content
- Created reusable `TooltipManager` utility class in `utils/tooltips.ts`

#### 3. Prevented Code Duplication ✅

**Problem**: Risk of duplicating tooltip logic across components.

**Solution**:

- Extracted tooltip functionality into `src/utils/tooltips.ts`
- Created reusable `TooltipManager` class with configurable options
- Provided factory functions for easy initialization

#### 4. Improved Event Management ✅

**Problem**: No cleanup of event listeners, potential memory leaks.

**Solution**:

- Proper event listener cleanup in `TooltipManager`
- Scoped event handlers to component instances
- Storage of manager references for future cleanup

## Component Usage

### ShikiCodeBlock

```astro
---
import ShikiCodeBlock from './ShikiCodeBlock.astro'
---

<ShikiCodeBlock
  code={`const example = "Hello World"`}
  annotations={[{ pattern: 'const', note: 'Variable declaration keyword' }]}
  filename="example.tsx"
  playgroundUrl="https://stackblitz.com/github/reatom/reatom/tree/v1001/examples/react-search"
/>
```

### CodeExample (Multiple Blocks)

```astro
---
import CodeExample from './CodeExample.astro'
---

<CodeExample />
```

## Tooltip System

### TooltipManager Utility

The `TooltipManager` class provides:

- **Automatic positioning**: Smart positioning that avoids viewport edges
- **Event delegation**: Works with dynamically added content
- **Mutation observation**: Automatically handles content changes
- **Cleanup management**: Proper resource cleanup
- **Configuration options**: Customizable selectors and positioning

### Configuration Options

```typescript
interface TooltipConfig {
  componentId: string // Required: Unique component identifier
  tooltipSelector?: string // Default: '.code-tooltip'
  triggerSelector?: string // Default: '.code-annotation'
  dataAttribute?: string // Default: 'data-note'
  position?: 'top' | 'bottom' | 'auto' // Default: 'auto'
  offset?: number // Default: 10
}
```

### Usage Examples

```typescript
// Simple initialization (uses defaults)
const manager = initializeComponentTooltips('my-component-id')

// Advanced configuration
const manager = createTooltipManager({
  componentId: 'my-component-id',
  triggerSelector: '.interactive-element',
  dataAttribute: 'data-tooltip-text',
  position: 'bottom',
  offset: 15,
})
```

## Best Practices

### 1. Component Isolation

- Always generate unique component IDs
- Use `data-component-id` for scoping
- Avoid global selectors within components

### 2. Event Management

- Use event delegation for dynamic content
- Store cleanup functions for proper resource management
- Prefer scoped event handlers over global ones

### 3. Accessibility

- Include proper ARIA attributes (`role="tooltip"`)
- Ensure keyboard navigation works
- Provide alternative access methods for tooltip content

### 4. Performance

- Use `MutationObserver` sparingly and with targeted selectors
- Cleanup observers when components are destroyed
- Debounce expensive operations like positioning calculations

## Related Components

### Outside Landing Directory

- **`MarkdownContent.astro`**: Handles Mermaid diagram rendering for documentation pages
- **`starlight/`** components: Starlight-specific overrides for the documentation site

### No Duplication Found ✅

The review confirmed that:

- `ShikiCodeBlock.astro` is the only syntax highlighting component in the landing section
- `MarkdownContent.astro` serves a different purpose (Mermaid diagrams)
- No conflicting tooltip implementations exist

## Future Development

### Adding New Interactive Components

1. Use the `TooltipManager` utility for consistent tooltip behavior
2. Generate unique component IDs to avoid conflicts
3. Follow the event delegation pattern for dynamic content
4. Include proper cleanup mechanisms

### Extending Tooltip Functionality

1. Add new configuration options to `TooltipConfig`
2. Extend the `TooltipManager` class methods
3. Maintain backward compatibility
4. Add tests for new features

### Performance Monitoring

- Watch for memory leaks in long-lived pages
- Monitor mutation observer performance
- Consider virtual scrolling for large code examples
