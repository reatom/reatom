# Documentation for @reatom/lit

This directory contains TypeScript source files for the Lit integration documentation. The documentation is generated into Markdown format from these files.

## Structure

- `config.ts` - Configuration for documentation generation
- `intro.md` - Package introduction

### Basic Usage (`basic/`)

- `quick-start.ts` - Quick start example
- `reatom-lit-element.ts` - ReatomLitElement explanation
- `watch-directive.ts` - Watch directive explanation
- `auto-reactivity.ts` - Automatic reactivity with html/svg
- `reactive-component.ts` - Reactive component example
- `multiple-atoms.ts` - Multiple atoms example
- `passing-atoms.ts` - Passing atoms as properties

### Advanced Patterns (`advanced/`)

- `when-to-use.ts` - When to use Reatom vs Lit properties
- `mixed-reactivity.ts` - Mixed reactivity example
- `benefits.ts` - Benefits of mixed reactivity
- `async-operations.ts` - Async operations with wrap()
- `lifecycle.ts` - Lifecycle hooks
- `atomization.ts` - Atomization pattern for lists
- `mixin.ts` - withReatomElement mixin
- `ssr.ts` - Server-side rendering and hydration

### Examples (`examples/`)

- `todo-app.ts` - Complete Todo application
- `login-form.ts` - Form with validation
- `paginated-list.ts` - List with pagination
- `component-composition.ts` - Component composition
- `orderbook.ts` - Real-time WebSocket orderbook (demo reference)

### Best Practices (`best-practices/`)

- `organization.ts` - Code organization
- `registration.ts` - Safe element registration
- `memory.ts` - Memory management
- `debugging.ts` - Debugging tips
- `performance.ts` - Performance considerations
- `testing.ts` - Testing with Vitest

## How It Works

Each TypeScript file contains:

- JSDoc comments with `@doc-expand` annotation for content extraction
- Example code that is valid TypeScript
- Import statements using `@reatom/lit` (automatically resolved)

The `build-docs.ts` script reads these files and generates Markdown documentation by:

1. Extracting JSDoc comments for descriptions
2. Including code in code blocks
3. Organizing content according to `config.ts`

## Generating Documentation

Run the following command from the package root:

```bash
pnpm run docs:gen
```

This will generate markdown files in `docs/src/content/docs/handbook/lit/`.

## Notes

- All imports use `@reatom/lit` which is automatically resolved
- Code is type-checked and validated
- Changes to TypeScript files automatically update the generated documentation
