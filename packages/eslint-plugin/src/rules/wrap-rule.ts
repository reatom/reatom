import type * as estree from 'estree'
import type { Rule } from 'eslint'
import { reatomFactoryPattern } from '../shared'

// List of functions whose callbacks must be wrapped
const CALLBACK_FUNCS = [
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'queueMicrotask',
]
const NODE_CALLBACK_FUNCS = ['process.nextTick']

function isReatomContextCallee(node: estree.Node): boolean {
  // action(...), computed(...), effect(...)
  if (
    node.type === 'Identifier' &&
    reatomFactoryPattern.test(node.name)
  ) {
    return true
  }
  // .extend(...)
  if (
    node.type === 'MemberExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'extend'
  ) {
    return true
  }
  // .actions(...)
  if (
    node.type === 'MemberExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'actions'
  ) {
    return true
  }
  return false
}

function isReatomContext(node: estree.Node, context: Rule.RuleContext): boolean {
  // Walk up the AST to see if this function is passed to a reatom context
  let parent = (node as any).parent
  while (parent) {
    if (parent.type === 'CallExpression') {
      if (isReatomContextCallee(parent.callee)) {
        // If this node is the first argument
        if (parent.arguments[0] === node) return true
      }
      // .extend(withSomething(...))
      if (
        parent.callee.type === 'MemberExpression' &&
        parent.callee.property.type === 'Identifier' &&
        parent.callee.property.name === 'extend'
      ) {
        if (parent.arguments[0] === node) return true
      }
      // .actions(target => ({ ... }))
      if (
        parent.callee.type === 'MemberExpression' &&
        parent.callee.property.type === 'Identifier' &&
        parent.callee.property.name === 'actions'
      ) {
        if (parent.arguments[0] === node) return true
      }
    }
    parent = parent.parent
  }
  return false
}

function isWrapped(node: estree.Node): boolean {
  // Checks if node is wrap(...)
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'wrap'
  )
}

function findImportDeclaration(sourceCode: Rule.RuleContext['sourceCode']): estree.ImportDeclaration | undefined {
  return sourceCode.ast.body.find(
    (n: any) =>
      n.type === 'ImportDeclaration' &&
      n.source.value === '@reatom/core',
  ) as estree.ImportDeclaration | undefined
}

export const wrapRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      recommended: true,
      description:
        'Ensures await and async callbacks in Reatom context are wrapped with wrap(...)',
    },
    fixable: 'code',
    messages: {
      awaitMissingWrap: 'Await expression in Reatom context must be wrapped with `wrap`.',
      callbackMissingWrap:
        "Callback for '{{name}}' in Reatom context must be wrapped with `wrap`.",
    },
    schema: [],
  },
  // @ts-expect-error: required by @typescript-eslint/rule-tester
  defaultOptions: [],
  create(context) {
    const sourceCode = context.getSourceCode()
    function ensureWrapImport(fixer: Rule.RuleFixer) {
      const importDecl = findImportDeclaration(sourceCode)
      if (!importDecl) return null
      const hasWrap = importDecl.specifiers.some(
        (s) =>
          s.type === 'ImportSpecifier' &&
          (s.imported as estree.Identifier).name === 'wrap',
      )
      if (hasWrap) return null
      // Insert wrap into the import specifiers
      if (importDecl.specifiers.length > 0) {
        const lastSpecifier = importDecl.specifiers[importDecl.specifiers.length - 1]
        if (lastSpecifier) {
          return fixer.insertTextAfter(lastSpecifier, `, wrap`)
        }
      } else {
        // No specifiers, insert wrap as the first specifier
        const importStart = importDecl.source.range ? importDecl.source.range[0] : null
        if (importStart !== null) {
          // This is a rare case, but for safety
          return fixer.insertTextBefore(importDecl.source, 'wrap, ')
        }
        // fallback: do nothing
        return null
      }
      return null
    }

    function wrapFixer(node: estree.Node, fixer: Rule.RuleFixer) {
      // Wrap the node in wrap(...)
      return fixer.replaceText(node, `wrap(${sourceCode.getText(node)})`)
    }

    function addWrapAndImportFix(node: estree.Node, fixer: Rule.RuleFixer) {
      const fixes = [wrapFixer(node, fixer)]
      const importFix = ensureWrapImport(fixer)
      if (importFix) fixes.push(importFix)
      return fixes
    }

    return {
      AwaitExpression(node: estree.AwaitExpression) {
        if (!isReatomContext(node, context)) return
        if (isWrapped(node.argument)) return
        context.report({
          node,
          messageId: 'awaitMissingWrap',
          fix: (fixer) => addWrapAndImportFix(node.argument, fixer),
        })
      },
      CallExpression(node: estree.CallExpression) {
        // Check for setTimeout, setInterval, etc. in reatom context
        let calleeName = null
        if (node.callee.type === 'Identifier') {
          if (CALLBACK_FUNCS.includes(node.callee.name)) {
            calleeName = node.callee.name
          }
        } else if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'process' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'nextTick'
        ) {
          calleeName = 'process.nextTick'
        }
        if (!calleeName) return
        // Only check if in reatom context
        if (!isReatomContext(node, context)) return
        const callbackArg = node.arguments[0]
        if (!callbackArg) return
        if (isWrapped(callbackArg)) return
        // Only functions or identifiers (for named functions)
        if (
          callbackArg.type === 'FunctionExpression' ||
          callbackArg.type === 'ArrowFunctionExpression' ||
          callbackArg.type === 'Identifier'
        ) {
          context.report({
            node: callbackArg,
            messageId: 'callbackMissingWrap',
            data: { name: calleeName },
            fix: (fixer) => addWrapAndImportFix(callbackArg, fixer),
          })
        }
      },
    }
  },
}
