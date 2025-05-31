<!--
Scraped from the docs in May 2025:
- https://eslint.org/docs/latest/extend/plugins
- https://eslint.org/docs/latest/extend/custom-rule-tutorial
- https://eslint.org/docs/latest/extend/custom-rules
-->

# ESLint Plugin Development Notes (ESLint 9)

This document summarizes key information for developing ESLint plugins and custom rules, based on the official ESLint documentation.

## 1. Extending ESLint: Plugins

Source: [https://eslint.org/docs/latest/extend/plugins](https://eslint.org/docs/latest/extend/plugins)

ESLint plugins extend ESLint with additional functionality, typically by encapsulating custom rules, processors, and configurations.

### Creating a Plugin

A plugin is a JavaScript object with the following optional properties:

- `meta`: Information about the plugin (name, version).
- `configs`: An object containing named configurations.
- `rules`: An object containing definitions of custom rules.
- `processors`: An object containing named processors.

Recommended plugin entrypoint structure:

```typescript
// for ESM
import type { ESLint } from 'eslint';

const plugin: ESLint.Plugin = {
  meta: {},
  configs: {},
  rules: {},
  processors: {},
};
export default plugin;

// OR for CommonJS
import type { ESLint } from 'eslint';

const plugin: ESLint.Plugin = {
  /* ... */
};
module.exports = plugin;
```

If distributed via npm, the module exporting the plugin object should be the default export.

#### Meta Data in Plugins

It's recommended to provide `name` and `version` in a `meta` object for easier debugging and caching.

```typescript
import type { ESLint } from 'eslint';

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-example',
    version: '1.2.3',
  },
  // ...
};
```

The `meta.name` should match the npm package name, and `meta.version` should match the npm package version. This can be read from `package.json`:

```typescript
import fs from 'fs';
import { URL } from 'url';
import type { ESLint } from 'eslint';

const pkg = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

const plugin: ESLint.Plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },
  // ...
};
export default plugin;
```

Alternatively, `name` and `version` can be exposed at the root of the plugin object.

#### Rules in Plugins

Plugins expose custom rules via a `rules` object (key-value map of rule ID to rule definition). Rule IDs should not contain `/`.

```typescript
import type { Rule } from 'eslint';

const plugin: { rules: Record<string, Rule.RuleModule> } = {
  // ...
  rules: {
    'dollar-sign': {
      create(context: Rule.RuleContext) {
        // rule implementation ...
        return {};
      },
    },
  },
};
```

To use a plugin rule in `eslint.config.ts`:

```typescript
// eslint.config.ts
import { defineConfig } from 'eslint/config';
import example from 'eslint-plugin-example';

export default defineConfig([
  {
    plugins: {
      example, // namespace for the plugin
    },
    rules: {
      'example/dollar-sign': 'error', // rule prefixed with namespace
    },
  },
]);
```

#### Processors in Plugins

Plugins expose [processors](https://eslint.org/docs/latest/extend/custom-processors) via a `processors` object.

```typescript
import type { ESLint } from 'eslint';

const plugin: { processors: Record<string, ESLint.Processor> } = {
  // ...
  processors: {
    'processor-name': {
      preprocess(text: string, filename: string): Array<string | { text: string; filename: string }> {
        /* ... */
        return [text];
      },
      postprocess(messages: Array<Array<ESLint.Linter.LintMessage>>, filename: string): Array<ESLint.Linter.LintMessage> {
        /* ... */
        return messages[0];
      },
    },
  },
};
```

To use a plugin processor in `eslint.config.ts`:

```typescript
// eslint.config.ts
import { defineConfig } from 'eslint/config';
import example from 'eslint-plugin-example';

export default defineConfig([
  {
    files: ['**/*.txt'],
    plugins: {
      example,
    },
    processor: 'example/processor-name',
  },
]);
```

#### Configs in Plugins

Bundle configurations within a plugin using the `configs` key. This is useful for sharing recommended rule sets.

```typescript
import type { ESLint } from 'eslint';

const plugin: ESLint.Plugin = {
  meta: {
    /* ... */
  },
  configs: {},
  rules: {
    /* ... */
  },
};

// Assign configs after plugin definition to reference `plugin`
Object.assign(plugin.configs, {
  recommended: [
    // Can be a single config object or an array of config objects
    {
      plugins: {
        example: plugin, // Reference the plugin itself
      },
      rules: {
        'example/dollar-sign': 'error',
      },
      languageOptions: {
        globals: { myGlobal: 'readonly' },
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
  ],
});
```

To use a plugin config in `eslint.config.ts`:

```typescript
// eslint.config.ts
import { defineConfig } from 'eslint/config';
import example from 'eslint-plugin-example';

export default defineConfig([
  {
    files: ['**/*.ts'],
    plugins: {
      example,
    },
    extends: ['example/recommended'], // Extends the 'recommended' config from 'example' plugin
  },
]);
```

##### Backwards Compatibility for Legacy Configs (eslintrc)

To support both flat config (`eslint.config.ts`) and legacy config (`.eslintrc.ts`), export both types from the `configs` key.
Legacy configs can be prefixed with `"legacy-"`.
If maintaining old names (e.g., `"recommended"`), flat configs can be prefixed with `"flat/"` (e.g., `"flat/recommended"`).

```typescript
import type { ESLint } from 'eslint';

declare const plugin: ESLint.Plugin; // Assuming plugin is defined elsewhere

Object.assign(plugin.configs, {
  // flat config format
  'flat/recommended': [
    /* ... flat config object ... */
  ],

  // eslintrc format
  recommended: {
    /* ... eslintrc config object ... */
  },
});
```

The `defineConfig()` helper will first look for `recommended`, then `flat/recommended`.

### Testing a Plugin

Use ESLint's [`RuleTester`](https://eslint.org/docs/latest/integrate/nodejs-api#ruletester) utility.

### Linting a Plugin

Lint your plugin with recommended configs from:

- `eslint`
- `eslint-plugin-eslint-plugin`
- `eslint-plugin-n`

### Share Plugins (npm)

1.  **List ESLint as a peer dependency** in `package.json`:
    ```json
    {
      "peerDependencies": {
        "eslint": ">=9.0.0"
      }
    }
    ```
2.  **Specify keywords** in `package.json`: `eslint`, `eslintplugin`, `eslint-plugin`.

## 2. Custom Rule Tutorial

Source: [https://eslint.org/docs/latest/extend/custom-rule-tutorial](https://eslint.org/docs/latest/extend/custom-rule-tutorial)

This tutorial demonstrates creating a custom rule `enforce-foo-bar` that requires `const foo` to be assigned `"bar"`.

### Why Create a Custom Rule?

- When built-in or community rules don't meet specific needs.
- To enforce company/project best practices, prevent bugs, or ensure style guide compliance.
- Search for existing solutions before creating a new general-purpose rule.

### Prerequisites

- Node.js
- npm
- Basic understanding of ESLint and rules.

### The Custom Rule Example: `enforce-foo-bar`

- Requires `const foo = "bar";`
- Suggests fixing incorrect assignments.
  - Example: `const foo = "baz123";` flags `"baz123"` and autofixes to `"bar"`.

### Step 1: Set up Your Project

```bash
mkdir eslint-custom-rule-example
cd eslint-custom-rule-example
npm init -y
touch enforce-foo-bar.ts
```

### Step 2: Stub Out the Rule File

```typescript
// enforce-foo-bar.ts
import type { Rule } from 'eslint';
import type { AST } from '@typescript-eslint/utils';

const rule: Rule.RuleModule = {
  meta: {
    // TODO: add metadata
  },
  create(context: Rule.RuleContext) {
    return {
      // TODO: add callback function(s)
    };
  },
};

export default rule;
```

### Step 3: Add Rule Metadata

ESLint uses metadata when running the rule.

```typescript
// enforce-foo-bar.ts
import type { Rule } from 'eslint';
import type { AST } from '@typescript-eslint/utils';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem', // "problem", "suggestion", or "layout"
    docs: {
      description:
        "Enforce that a variable named `foo` can only be assigned a value of 'bar'.",
    },
    fixable: 'code', // "code" or "whitespace" if autofixable
    schema: [], // Options schema (empty if no options)
  },
  create(context: Rule.RuleContext) {
    /* ... */
    return {};
  },
};

export default rule;
```

Refer to [Rule Structure](https://eslint.org/docs/latest/extend/custom-rules#rule-structure) for more on metadata.

### Step 4: Add Rule Visitor Methods

The `create` function returns an object with methods for AST node types (ESTree) or selectors.
This example handles `VariableDeclarator` nodes.

```typescript
// enforce-foo-bar.ts
import type { Rule } from 'eslint';
import type { AST } from '@typescript-eslint/utils';

const rule: Rule.RuleModule = {
  meta: {
    /* ... */
  },
  create(context: Rule.RuleContext) {
    return {
      VariableDeclarator(node: AST.Node) {
        // Ensure node is a VariableDeclarator for type safety
        if (node.type !== 'VariableDeclarator') {
          return;
        }

        // Check if a `const` variable declaration
        // node.parent should be a VariableDeclaration
        if (node.parent && node.parent.type === 'VariableDeclaration' && node.parent.kind === 'const') {
          // Check if variable name is `foo`
          if (node.id.type === 'Identifier' && node.id.name === 'foo') {
            // Check if value of variable is "bar"
            if (
              node.init &&
              node.init.type === 'Literal' &&
              node.init.value !== 'bar'
            ) {
              context.report({
                node,
                message:
                  'Value other than "bar" assigned to `const foo`. Unexpected value: {{ notBar }}.',
                data: {
                  // For message placeholders
                  notBar: node.init.value,
                },
                fix(fixer: Rule.Fixer) {
                  return fixer.replaceText(node.init as AST.Node, '"bar"');
                },
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
```

### Step 5: Set up Testing

Use ESLint's built-in `RuleTester`.
Create `enforce-foo-bar.test.ts`.
Install `eslint` as a dev dependency: `npm install --save-dev eslint`.
Add a test script to `package.json`:

```json
{
  "scripts": {
    "test": "node enforce-foo-bar.test.ts"
  }
}
```

### Step 6: Write the Test

```typescript
// enforce-foo-bar.test.ts
import { RuleTester } from 'eslint';
import rule from './enforce-foo-bar'; // Use import for TS

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2015 }, // For `const`
});

ruleTester.run(
  'enforce-foo-bar', // rule name
  rule, // rule code
  {
    valid: [{ code: "const foo = 'bar';" }],
    invalid: [
      {
        code: "const foo = 'baz';",
        output: 'const foo = "bar";', // Expected output after autofix
        errors: [{ message: 'Value other than "bar" assigned to `const foo`. Unexpected value: baz.' }], // Use message for simpler tests
      },
    ],
  },
);

console.log('All tests passed!');
```

### Step 7: Bundle the Custom Rule in a Plugin

Create `eslint-plugin-example.ts`.
Plugins are exported JavaScript objects. Rules are in the `rules` object.

```typescript
// eslint-plugin-example.ts
import type { ESLint } from 'eslint';
import fooBarRule from './enforce-foo-bar'; // Use import for TS

const plugin: ESLint.Plugin = {
  rules: {
    'enforce-foo-bar': fooBarRule,
  },
};

export default plugin;
```

### Step 8: Use the Plugin Locally

Create `eslint.config.ts` (flat configuration).

```typescript
// eslint.config.ts
import { defineConfig } from 'eslint/config';
import eslintPluginExample from './eslint-plugin-example'; // Local plugin

export default defineConfig([
  {
    files: ['**/*.ts'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: { example: eslintPluginExample }, // 'example' is the namespace
    rules: {
      'example/enforce-foo-bar': 'error',
    },
  },
]);
```

Create `example.ts` to test:

```typescript
// example.ts
function correctFooBar(): void {
  const foo = 'bar';
}
function incorrectFoo(): void {
  const foo = 'baz'; /* Problem! */
}
```

Run ESLint: `npx eslint example.ts`.

### Step 9: Publish the Plugin

Configure `package.json`:

1.  `"name"`: Unique npm package name (e.g., `eslint-plugin-myrule`).
2.  `"main"`: Path to plugin file (e.g., `"eslint-plugin-example.ts"`).
3.  `"description"`: Package description.
4.  `"peerDependencies"`: `{ "eslint": ">=9.0.0" }`.
5.  `"keywords"`: `["eslint", "eslintplugin", "eslint-plugin"]`.

Example `package.json` snippet:

```json
{
  "name": "eslint-plugin-example", // Choose a unique name
  "version": "1.0.0",
  "description": "ESLint plugin for enforce-foo-bar rule.",
  "main": "eslint-plugin-example.ts",
  "scripts": { "test": "node enforce-foo-bar.test.ts" },
  "peerDependencies": { "eslint": ">=9.0.0" },
  "keywords": ["eslint", "eslintplugin", "eslint-plugin"],
  "author": "",
  "license": "ISC",
  "devDependencies": { "eslint": "^9.0.0", "@typescript-eslint/parser": "^7.0.0", "@typescript-eslint/utils": "^7.0.0" }
}
```

Publish with `npm publish`.

### Step 10: Use the Published Custom Rule

Install the published package: `npm install --save-dev eslint-plugin-example` (use your package name).
Update `eslint.config.ts` to import from the installed package:

```typescript
// eslint.config.ts
import { defineConfig } from 'eslint/config';
import eslintPluginExample from 'eslint-plugin-example'; // From npm

export default defineConfig([
  {
    files: ['**/*.ts'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: { example: eslintPluginExample },
    rules: {
      'example/enforce-foo-bar': 'error',
    },
  },
]);
```

Run ESLint: `npx eslint example.ts`.
To autofix: `npx eslint example.ts --fix`.

### Summary of Tutorial Learnings

1.  Creating a custom ESLint rule.
2.  Testing the custom rule with `RuleTester`.
3.  Bundling the rule in a plugin.
4.  Publishing the plugin to npm.
5.  Using the rule from the published plugin.

### View the Tutorial Code

Annotated source code: [https://github.com/eslint/eslint/tree/main/docs/\_examples/custom-rule-tutorial-code](https://github.com/eslint/eslint/tree/main/docs/_examples/custom-rule-tutorial-code)

## 3. Custom Rules Deep Dive

Source: [https://eslint.org/docs/latest/extend/custom-rules](https://eslint.org/docs/latest/extend/custom-rules)

### Rule Structure

A rule exports an object with `meta` and `create` properties.

```typescript
import type { Rule } from 'eslint';
import type { AST } from '@typescript-eslint/utils';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion', // "problem", "suggestion", or "layout"
    docs: {
      description: 'Description of the rule',
      recommended: false, // boolean, for core rules if in 'recommended' config
      url: '...', // URL to full documentation
    },
    fixable: 'code', // "code" or "whitespace", if autofixable by --fix
    hasSuggestions: false, // boolean, if rule provides suggestions
    schema: [], // Options schema or `false` if no options validation
    defaultOptions: [], // Default values for options
    deprecated: false, // boolean or DeprecatedInfo object
    // replacedBy: [], // Deprecated, use meta.deprecated.replacedBy
  },
  create: function (context: Rule.RuleContext) {
    return {
      // Visitor methods for AST nodes (e.g., Identifier, FunctionExpression:exit)
      // Event handlers for code path analysis (e.g., onCodePathStart)
    };
  },
};

export default rule;
```

- `meta.type`:
  - `"problem"`: Code that will cause an error or confusing behavior. High priority.
  - `"suggestion"`: Code that could be improved; no errors if unchanged.
  - `"layout"`: Whitespace, semicolons, commas, parentheses (code appearance).
- `meta.docs`: For documentation and tooling.
- `meta.fixable`: Mandatory for fixable rules. ESLint throws if a rule attempts to fix without this.
- `meta.hasSuggestions`: Mandatory for rules providing suggestions. ESLint throws if a rule attempts to suggest without this.
- `meta.schema`: JSON Schema for rule options. Mandatory if rule has options.
- `meta.defaultOptions`: Array of default values for options. User-provided options merge over these.
- `meta.deprecated`: See [Rule Deprecation](https://eslint.org/docs/latest/extend/rule-deprecation).
- `create(context)`: Returns an object of visitor methods.
  - Key is node type/selector (e.g., `Identifier`): called going down the AST.
  - Key is node type/selector + `:exit` (e.g., `FunctionExpression:exit`): called going up the AST.
  - Key is event name (e.g., `onCodePathStart`): for code path analysis.

### The Context Object

Passed to `create(context)`. Contains rule-relevant information.

Properties:

- `id`: Rule ID.
- `filename`: Filename associated with the source.
- `physicalFilename`: Full path of the file on disk (or `<text>` for stdin).
- `cwd`: Current working directory.
- `options`: Array of configured options for the rule (excludes severity).
- `sourceCode`: `SourceCode` object to work with the source.
- `settings`: Shared settings from configuration.
- `languageOptions`:
  - `sourceType`: `'script' | 'module' | 'commonjs'`.
  - `ecmaVersion`: Number.
  - `parser`: Parser object.
  - `parserOptions`: Parser options.
  - `globals`: Specified globals.
- Deprecated properties: `parserPath`, `parserOptions` (use `languageOptions` versions).

Methods:

- `report(descriptor)`: Reports a problem.
- Deprecated methods: `getCwd()`, `getFilename()`, `getPhysicalFilename()`, `getSourceCode()` (use direct properties).

#### Reporting Problems

`context.report(descriptor)`:

- `descriptor` object properties:
  - `messageId`: (string) ID of the message (recommended over `message`). From `meta.messages`.
  - `message`: (string) Problem message (alternative to `messageId`).
  - `node`: (optional AST node) Related to the problem. If present and `loc` absent, node's start location is used.
  - `loc`: (optional location object) `{ start: { line, column }, end: { line, column } }`. Overrides `node` location if both present. `line` is 1-based, `column` is 0-based.
  - `data`: (optional object) Placeholder data for `message` or `messageId`.
  - `fix(fixer)`: (optional function) Applies a fix.
  - `suggest`: (optional array of suggestion objects) Provides manual suggestions.

At least one of `node` or `loc` is required.

Example: `context.report({ node: node, message: "Unexpected identifier" });`

##### Using Message Placeholders

```typescript
import type { Rule } from 'eslint';
import type { AST } from '@typescript-eslint/utils';

// Assuming context is Rule.RuleContext and node is AST.Node
declare const context: Rule.RuleContext;
declare const node: AST.Node & { name: string }; // Assuming node has a name property

context.report({
  node: node,
  message: 'Unexpected identifier: {{ identifier }}',
  data: { identifier: node.name },
});
```

##### `messageId`s

Recommended for managing messages. Store messages in `meta.messages`.

```typescript
// Rule file
import type { Rule } from 'eslint';
import type { AST } from '@typescript-eslint/utils';

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      avoidName: "Avoid using variables named '{{ name }}'",
    },
  },
  create(context: Rule.RuleContext) {
    return {
      Identifier(node: AST.Node) {
        if (node.type === 'Identifier' && node.name === 'foo') {
          context.report({
            node,
            messageId: 'avoidName',
            data: { name: 'foo' },
          });
        }
      },
    };
  },
};

export default rule;

// Test file
import { RuleTester } from 'eslint';
// Assuming 'rule' is imported from the rule file
declare const rule: Rule.RuleModule;

const ruleTester = new RuleTester();

ruleTester.run('avoid-name', rule, {
  valid: ['bar'],
  invalid: [{ code: 'foo', errors: [{ messageId: 'avoidName' }] }],
});
```

##### Applying Fixes

Specify `fix(fixer)` function in `context.report()`. `meta.fixable` must be set.
`fixer` object methods:

- `insertTextAfter(nodeOrToken, text)`
- `insertTextAfterRange(range, text)`
- `insertTextBefore(nodeOrToken, text)`
- `insertTextBeforeRange(range, text)`
- `remove(nodeOrToken)`
- `removeRange(range)`
- `replaceText(nodeOrToken, text)`
- `replaceTextRange(range, text)`

A `range` is `[startIndex, endIndexExclusive]`.
`fix()` can return a single fixing object, an array, or an iterable of fixing objects. Fixes must not overlap.

Best practices for fixes:

1.  Avoid changing runtime behavior.
2.  Make fixes small.
3.  One fix per message.
4.  Don't worry about style conflicts with other rules; ESLint re-runs rules after fixes.

##### Conflicting Fixes

If fixes modify the same code part, only one is applied (undefined which one).

##### Providing Suggestions

For fixes not suitable for automatic application. Use `suggest` key in `context.report()`.
`meta.hasSuggestions` must be `true`.
Each suggestion object: `{ desc | messageId, fix(fixer) }`.

```typescript
import type { Rule } from 'eslint';
import type { AST } from '@typescript-eslint/utils';

// Assuming context is Rule.RuleContext, node is AST.Node, character is string, range is [number, number]
declare const context: Rule.RuleContext;
declare const node: AST.Node;
declare const character: string;
declare const range: [number, number];

context.report({
  node: node,
  messageId: 'unnecessaryEscape',
  data: { character },
  suggest: [
    {
      messageId: 'removeEscape', // or desc: "Remove the `\\`."
      data: { character }, // data for this specific suggestion message
      fix: function (fixer: Rule.Fixer) {
        return fixer.removeRange(range);
      },
    },
    // ... other suggestions
  ],
});
```

Suggestions are stand-alone changes, not part of multipass autofixing.

#### Accessing Options Passed to a Rule

`context.options` is an array of configured options (e.g., for `["error", "double"]`, `context.options[0]` is `"double"`).
Rules with options must specify `meta.schema`.

#### Accessing the Source Code

`context.sourceCode` is a `SourceCode` object.
Methods:

- `getText(node?, beforeCount?, afterCount?)`: Get source text.
- `getAllComments()`: Array of all comment tokens.
- `getCommentsBefore(nodeOrToken)`, `getCommentsAfter(nodeOrToken)`, `getCommentsInside(node)`
- `isSpaceBetween(nodeOrToken1, nodeOrToken2)`: True if whitespace between.
- Token retrieval: `getFirstToken(node, skipOptions?)`, `getLastToken(node, skipOptions?)`, `getTokenAfter(nodeOrToken, skipOptions?)`, `getTokenBefore(nodeOrToken, skipOptions?)`, `getTokens(node)`, `getTokensBetween(node1, node2)`, `getTokenByRangeStart(index, rangeOptions?)`.
  - `skipOptions`: `{ skip?: number, includeComments?: boolean, filter?: (token) => boolean }`
  - `countOptions`: `{ count?: number, includeComments?: boolean, filter?: (token) => boolean }` (for `getXTokens` methods)
- `getNodeByRangeIndex(index)`: Deepest AST node containing source index.
- `getLocFromIndex(index)`: `{ line, column }` from source index.
- `getIndexFromLoc(loc)`: Source index from `{ line, column }`.
- `commentsExistBetween(nodeOrToken1, nodeOrToken2)`
- `getAncestors(node)`: Array of ancestor nodes.
- `getDeclaredVariables(node)`: List of variables declared by the node.
- `getScope(node)`: Scope of the given node.
- `markVariableAsUsed(name, refNode?)`: Marks variable as used (for `no-unused-vars`).

Properties:

- `hasBOM`: Boolean.
- `text`: Full source text (BOM stripped).
- `ast`: `Program` node of the AST.
- `scopeManager`: `ScopeManager` object.
- `visitorKeys`: Visitor keys for AST traversal.
- `parserServices`: Parser-provided services (e.g., for TypeScript types).
- `lines`: Array of lines.

#### Options Schemas (`meta.schema`)

JSON Schema to validate rule options. Mandatory if rule has options.
Opt-out with `schema: false` (discouraged).
Omit or use `schema: []` if no options.

Validation steps:

1.  Rule config wrapped in array if not already.
2.  First element validated as severity.
3.  If severity is `off`/`0`, rule disabled, validation stops.
4.  Remaining elements become `context.options`.
5.  Schema validates `context.options`.

Formats for `meta.schema`:

1.  **Array of JSON Schema objects**: Each schema validates corresponding `context.options` element.
    - `yoda: ["error", "never", { "exceptRange": true }]`
    - `schema: [ { enum: ["always", "never"] }, { type: "object", properties: { exceptRange: { type: "boolean" } } } ]`
2.  **Full JSON Schema object**: Validates the entire `context.options` array. More flexible.
    - Schema should assume an array of options.
    - Supports JSON Schema Draft-04.

If using `$ref` in schema, must use the full JSON Schema object format, not the array shorthand.

#### Option Defaults (`meta.defaultOptions`)

Array of default values for options. User-provided options are merged recursively on top of these.
Defaults are also validated against `meta.schema`.
ESLint uses Ajv with `useDefaults` enabled; this might change.

Example:

```typescript
meta: {
    defaultOptions: [{ alias: "basic" }],
    schema: [{ type: "object", properties: { alias: { type: "string" } } }],
},
// If user config is ["error"], context.options will be [{ alias: "basic" }]
// If user config is ["error", { alias: "complex" }], context.options will be [{ alias: "complex" }]
```

#### Accessing Shebangs

Shebangs (`#!`) are `Shebang` type tokens, treated as comments. Access via `sourceCode.getAllComments()` or other comment methods.

#### Accessing Variable Scopes

`sourceCode.getScope(node)` returns the scope object for the given AST node.
Scope types include `global`, `function`, `class`, `block`, `switch`, `for`, `with`, `catch`.
`Scope#variables`: Array of `Variable` objects declared in the scope.
`Variable#references`: Array of `Reference` objects (where variable is used).
`Variable#defs`: Array of `Definition` objects (where variable is defined).

Global variables have additional properties like `writeable`, `eslintExplicitGlobal`.

#### Marking Variables as Used

`sourceCode.markVariableAsUsed(name, refNode?)`
Helps rules like `no-unused-vars` recognize custom variable usage.
`refNode` indicates the scope to start searching from. If omitted, top-level scope is used.

#### Accessing Code Paths

ESLint analyzes code paths. Access via events like `onCodePathStart`, `onCodePathEnd`. See [Code Path Analysis](https://eslint.org/docs/latest/extend/code-path-analysis).

#### Deprecated `SourceCode` Methods

- `getTokenOrCommentBefore()` -> `getTokenBefore({ includeComments: true })`
- `getTokenOrCommentAfter()` -> `getTokenAfter({ includeComments: true })`
- `isSpaceBetweenTokens()` -> `isSpaceBetween()`
- `getJSDocComment()`

### Rule Unit Tests

Use `RuleTester` from ESLint.

### Rule Naming Conventions

Follow core rule naming conventions for clarity. See [Core Rule Naming Conventions](https://eslint.org/docs/latest/contribute/core-rules#rule-naming-conventions).

### Runtime Rules

Define custom rules specific to a project at runtime.

1.  Place rules in a directory (e.g., `eslint_rules/`).
2.  Configure rule ID and severity in ESLint config.
3.  Run ESLint CLI with `--rulesdir path/to/eslint_rules`.

### Profile Rule Performance

Set `TIMING=1` environment variable to see performance of top 10 rules.
`TIMING=all` or `TIMING=50` for more.
For specific rule: `TIMING=1 eslint --no-eslintrc --rule "quotes: [2, 'double']" lib`
Use `stats` option for per-file-per-rule timing.

## 4. Reatom ESLint Plugin Development Guide

This section outlines best practices and a typical workflow for developing ESLint rules specifically for Reatom projects.

### Core Principles

- **Test-Driven Development (TDD):** This is paramount. Write tests _before_ writing the rule logic. This ensures clarity of requirements, covers edge cases early, and provides a safety net for refactoring.
- **Autofix by Default:** Strive to make every rule autofixable (`meta.fixable = "code"` or `"whitespace"`). This significantly improves developer experience and adoption of the rules. If a fix is complex or has multiple valid outcomes, provide suggestions (`meta.hasSuggestions = true`).
- **Clarity and Performance:** Rules should be easy to understand and maintain. Prioritize clear, readable code. Be mindful of performance, especially for rules that traverse large ASTs or perform complex computations. Use ESLint's [profiling tools](#profile-rule-performance) if needed.
- **Focus on Reatom Patterns:** Rules should target common Reatom idioms, potential pitfalls, or style conventions specific to Reatom development.
- **Minimal Configuration:** Aim for rules that work well with sensible defaults, reducing the configuration burden on users. If options are necessary, provide clear `meta.schema` and `meta.defaultOptions`.

### Development Workflow (TDD-Focused)

1.  **Define the Problem & Rule Idea:**

    - Clearly articulate the code pattern you want to enforce or discourage.
    - What specific Reatom concept or best practice does this relate to?
    - What should the error message be? Should it be specific to Reatom?
    - Crucially, how should the code be _autofixed_?

2.  **Set up Rule and Test Files:**

    - Create `my-reatom-rule.ts` and `my-reatom-rule.test.ts`.
    - In `my-reatom-rule.ts`, stub out the basic rule structure:
      ```typescript
      import type { Rule } from 'eslint';
      import type { AST } from '@typescript-eslint/utils';

      const rule: Rule.RuleModule = {
        meta: {
          type: 'problem', // or "suggestion", "layout"
          docs: {
            description: 'Description specific to your Reatom rule.',
            category: 'Reatom', // Consider a custom category
            recommended: true, // Or false, depending on the rule
            url: '...', // Link to internal docs or Reatom best practices if applicable
          },
          fixable: 'code', // Prioritize this!
          schema: [], // Define if options are needed
          messages: {
            // Define messageIds here
            myErrorId: 'Concise error message about the Reatom pattern.',
          },
        },
        create(context: Rule.RuleContext) {
          return {
            // Visitor methods will be added based on tests
          };
        },
      };

      export default rule;
      ```

3.  **Write Tests First (using `RuleTester`):**

    - **Valid Cases:** Start with examples of code that _should not_ trigger the rule. These define the "correct" Reatom patterns.

      ```typescript
      // my-reatom-rule.test.ts
      import { RuleTester } from 'eslint';
      import rule from '../rules/my-reatom-rule'; // Adjust path as needed

      const ruleTester = new RuleTester({
        languageOptions: { ecmaVersion: 2020, sourceType: 'module', parser: '@typescript-eslint/parser' }, // Adjust as needed
      });

      ruleTester.run('my-reatom-rule', rule, {
        valid: [
          { code: '// Correct Reatom code example 1' },
          { code: '// Correct Reatom code example 2' },
          // Add more valid cases, including edge cases
        ],
        invalid: [
          // To be filled next
        ],
      });
      ```

    - **Invalid Cases & Autofixes:** For each way the rule can be violated:
      - Write a test case in `invalid`.
      - Specify the `code` that violates the rule.
      - Specify the `output` that represents the code _after autofixing_. This is key for TDD with autofixes.
      - Specify `errors` with the expected `messageId` (and `data` if using placeholders).
      ```typescript
      // ... in ruleTester.run
      invalid: [
          {
              code: "// Incorrect Reatom code example 1",
              output: "// Autofixed Reatom code example 1", // What it should become
              errors: [{ messageId: "myErrorId" }],
          },
          {
              code: "// Incorrect Reatom code example 2 with options",
              output: "// Autofixed Reatom code example 2 with options",
              options: [{ /* your option here */ }], // If rule has options
              errors: [{ messageId: "myErrorId", data: { /* ... */ } }],
          },
          // Add more invalid cases, covering different violations and edge cases
      ],
      ```
    - Run tests. They should fail because the rule logic isn't implemented yet.

4.  **Implement Rule Logic (`create` function and visitors):**

    - Iteratively write the minimal code in `my-reatom-rule.ts` to make the failing tests pass, one by one.
    - Use AST explorer tools (like [astexplorer.net](https://astexplorer.net/)) to understand the AST structure of the code patterns you're targeting.
    - Focus on identifying the relevant AST nodes and properties.
    - Implement the `fix(fixer)` function within `context.report()` to provide the autofix logic. Ensure the fixer operations match the `output` in your tests.
      ```typescript
      // my-reatom-rule.ts
      import type { Rule } from 'eslint';
      import type { AST } from '@typescript-eslint/utils';

      // Assuming rule is defined as Rule.RuleModule
      declare const rule: Rule.RuleModule;

      // ...
      // Inside rule.create(context)
      // ...
      create(context: Rule.RuleContext) {
          return {
              Identifier(node: AST.Node) { // Example visitor
                  if (/* condition for incorrect pattern */) {
                      context.report({
                          node,
                          messageId: "myErrorId",
                          fix(fixer: Rule.Fixer) {
                              // Implement fixer logic to transform `code` to `output`
                              // e.g., return fixer.replaceText(nodeToFix, "correct text");
                              return null; // Or actual fix
                          }
                      });
                  }
              }
              // Add other necessary visitors
          };
      }
      // ...
      ```

5.  **Refactor and Add More Tests:**

    - Once tests pass, refactor the rule logic for clarity and efficiency.
    - Think of more edge cases or variations of valid/invalid code and add tests for them. This is crucial for robust rules.
    - Consider testing with different Reatom versions or related libraries if the rule interacts with them.

6.  **Documentation:**

    - Ensure `meta.docs.description` is clear.
    - Add examples of correct and incorrect code in the rule's documentation file (if separate from these notes).
    - Explain any options the rule accepts.

7.  **Consider Suggestions:**
    - If an autofix is too complex, might change runtime behavior significantly, or has multiple valid outcomes, implement `meta.hasSuggestions = true` and provide `suggest` arrays in `context.report()`.
    - Write tests for suggestions too, checking the `suggestions` property in the `invalid` test cases.

### Tips for Reatom-Specific Rules:

- **AST Traversal:** Familiarize yourself with common AST node types used in Reatom code (e.g., `CallExpression` for `atom()`, `action()`; `Property` for object configurations).
- **Scope Analysis:** Use `context.sourceCode.getScope(node)` and related methods if your rule needs to understand variable declarations, references, or Reatom's reactive graph connections.
- **Performance:** Reatom applications can have many atoms and actions. If your rule involves complex graph traversal or analysis, test its performance on larger codebases.

By strictly following TDD and prioritizing autofixes, you can create highly effective and developer-friendly ESLint rules that significantly improve the quality and consistency of Reatom code.
