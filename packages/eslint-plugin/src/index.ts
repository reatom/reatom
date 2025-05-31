import type { ESLint } from 'eslint'
import { unitNamingRule } from './rules/unit-naming-rule'
import { wrapRule } from './rules/wrap-rule'

const rules = {
  'naming-rule': unitNamingRule,
  'wrap-rule': wrapRule,
}

export default {
  rules,
  configs: {
    recommended: {
      rules: Object.fromEntries(
        Object.keys(rules).map((ruleName) => {
          return [`@reatom/${ruleName}`, 'error']
        }),
      ),
    },
  },
} satisfies ESLint.Plugin
