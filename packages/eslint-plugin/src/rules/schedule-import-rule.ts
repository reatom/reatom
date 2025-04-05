import * as estree from 'estree'
import { Rule } from 'eslint'

const importsMap = {
  wrap: 'import { wrap } from "@reatom/framework";\n',
  schedule: 'import { schedule } from "@reatom/framework";\n',
}
const importNames = Object.keys(importsMap)

const getTextToReplace = (
  numberArgumentText: string,
  callbackArgumentText: string,
) => {
  if (numberArgumentText) {
    return `schedule(ctx, ${callbackArgumentText}, ${numberArgumentText})`
  }
  return `wrap(ctx, ${callbackArgumentText})`
}
const getMessage = (n?: estree.Expression | estree.SpreadElement) => {
  if (n) {
    return "Use 'schedule(ctx, cb, n)' instead of deprecated 'ctx.schedule(cb, n)'."
  }
  return "Use 'wrap(ctx, cb)' instead of deprecated 'ctx.schedule(cb)'."
}

export const scheduleImportRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: "Method 'ctx.schedule' is deprecated in v4",
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
  },
  create(context) {
    let hasImport = false
    let lastImport: estree.ImportDeclaration | null = null
    const existsImportSpecifiers = new Set()

    return {
      ImportDeclaration(node) {
        lastImport = node

        if (node.source.value === '@reatom/framework') {
          node.specifiers.forEach((specifier) => {
            if (
              specifier.type === 'ImportSpecifier' &&
              'name' in specifier.imported &&
              importNames.includes(specifier.imported.name)
            ) {
              hasImport = true
              existsImportSpecifiers.add(specifier.imported.name)
            }
          })
        }
      },

      'CallExpression[callee.type=MemberExpression][callee.object.type=Identifier][callee.object.name="ctx"][callee.property.type=Identifier][callee.property.name="schedule"]'(
        node: estree.CallExpression,
      ) {
        const callbackArgument = node.arguments[0]
        const numberArgument = node.arguments[1]

        context.report({
          node,
          message: getMessage(numberArgument),
          fix(fixer) {
            const fixes = [] as Rule.Fix[]
            const sourceCode = context.sourceCode
            const callbackArgumentText = callbackArgument
              ? sourceCode.getText(callbackArgument)
              : '() => {}'
            const numberArgumentText = numberArgument
              ? sourceCode.getText(numberArgument)
              : ''

            fixes.push(
              fixer.replaceText(
                node,
                getTextToReplace(numberArgumentText, callbackArgumentText),
              ),
            )

            const neededImport = numberArgument ? 'schedule' : 'wrap'

            if (!existsImportSpecifiers.has(neededImport)) {
              if (hasImport && lastImport) {
                const existedSpecifier = lastImport.specifiers.find(
                  (specifier) =>
                    specifier.type == 'ImportSpecifier' &&
                    'name' in specifier.imported &&
                    importNames.includes(specifier.imported.name),
                )

                if (existedSpecifier) {
                  fixes.push(
                    fixer.insertTextAfter(
                      existedSpecifier,
                      `, ${neededImport}`,
                    ),
                  )
                }
              } else {
                const importToAdd = importsMap[neededImport]
                fixes.push(
                  lastImport
                    ? fixer.insertTextBefore(lastImport, importToAdd)
                    : fixer.insertTextAfterRange([0, 0], importToAdd),
                )
              }
            }

            return fixes
          },
        })
      },
    }
  },
}
