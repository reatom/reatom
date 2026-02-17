# @doc-expand Annotation Guide

## Overview

The `@doc-expand` annotation provides explicit control over which JSDoc comments are extracted as markdown in the generated documentation.

## Default Behavior

By default, **all** JSDoc comments remain inside code blocks in the generated documentation. This keeps code examples clean and focused.

Only JSDoc comments marked with `@doc-expand` will be extracted and displayed as markdown text between code blocks.

## Usage

Add `@doc-expand` tag to JSDoc comments that should appear as separate markdown content:

```typescript
/**
 * This comment stays in the code block
 */
const a = 1

/**
 * @doc-expand
 * This comment becomes markdown between code blocks
 * Perfect for high-level explanations and benefits
 */
const b = 2

/**
 * This also stays in code - technical details
 */
const c = 3
```

**Generated output:**
```markdown
```ts
/**
 * This comment stays in the code block
 */
const a = 1

/**
 * This also stays in code - technical details
 */
const c = 3
```

This comment becomes markdown between code blocks
Perfect for high-level explanations and benefits

```ts
const b = 2
```
```

## When to Use @doc-expand

### ✅ Use for:

- **Section headers**: Introduce major sections of examples
- **Conceptual explanations**: High-level descriptions of patterns
- **Benefits**: Explain advantages of approaches
- **Usage guidance**: How to approach problems
- **File footers**: Summary sections like "This example demonstrates:"

### ❌ Don't use for:

- **Inline documentation**: Code-specific comments
- **Implementation notes**: Technical details
- **Type information**: TypeScript-specific docs
- **Parameter descriptions**: Function/method details
- **Performance notes**: Code-level optimization comments

## Examples

### Example 1: Section Header with Benefits

```typescript
/**
 * @doc-expand
 * BENEFIT: Single form definition replaces 10+ separate atoms
 * Before: email, password, isSubmitting, submitError, submitSuccess atoms
 * After: One reatomForm call with everything included
 */
const loginForm = reatomForm({ ... })
```

### Example 2: Technical Details Stay in Code

```typescript
/**
 * PERFORMANCE: Computed render props for error messages
 * These template parts are memoized and only update when their dependencies change
 */
emailErrorTemplate = computed(() => {
  const error = loginForm.fields.email.validation().error
  return error ? html`<div class="error">${error}</div>` : html``
}, 'emailErrorTemplate')
```

### Example 3: File Footer Summary

```typescript
/** @doc-expand
 * This example demonstrates:
 *
 * - Using reatomForm for simple, powerful form management
 * - Field-level validation with automatic error handling
 * - Built-in async states (isPending, error, data)
 * - ~40% less code than manual implementation
 */
```

## Migration Strategy

When updating existing documentation files:

1. **Start with file footers**: Add `@doc-expand` to summary sections at the end of files
2. **Key benefits**: Mark high-level benefit explanations
3. **Keep details in code**: Leave implementation details in code blocks
4. **Test generation**: Run `npm run docs:gen` and check the output
5. **Iterate**: Adjust based on how the documentation reads

## Testing

After adding `@doc-expand` annotations:

```bash
cd packages/lit
npm run docs:gen
```

Check the generated files in `docs/src/content/docs/handbook/lit/` to verify:
- Only `@doc-expand` comments appear as markdown
- All other comments remain in code blocks
- Code blocks are not overly fragmented
- Documentation flows naturally

## Technical Details

- **Tag location**: Can appear anywhere in the JSDoc comment
- **Tag visibility**: Automatically removed from generated output
- **Multiple tags**: Only one `@doc-expand` needed per comment
- **Combination**: Works with other JSDoc tags like `@file`, `@description`

## Implementation

The `@doc-expand` feature is implemented in `build-docs.ts`:

- `hasDocExpandTag()`: Detects the tag in JSDoc comments
- `parseJsDocToMarkdown()`: Removes the tag from output
- `extractFromTsFile()`: Two-pass approach to split content appropriately

## Related Files

- `packages/lit/build-docs.ts` - Build script with @doc-expand logic
- `packages/lit/docs/examples/login-form.ts` - Example with @doc-expand usage
- `packages/lit/docs/best-practices/performance.ts` - Best practices example
