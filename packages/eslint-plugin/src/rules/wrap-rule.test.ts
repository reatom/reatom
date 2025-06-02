import { wrapRule } from './wrap-rule'
import { RuleTester } from '@typescript-eslint/rule-tester'

RuleTester.afterAll = (fn: () => void) => fn()
RuleTester.describe = (name: string, fn: () => void) => fn()
RuleTester.it = (name: string, fn: () => void) => fn()

const tester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
})

const AWAIT_ERROR_MESSAGE =
  'Await expression in Reatom context must be wrapped with `wrap`.'
const CALLBACK_ERROR_MESSAGE = (name: string) =>
  `Callback for '${name}' in Reatom context must be wrapped with \`wrap\`.`

tester.run('wrap-rule', wrapRule, {
  valid: [
    // Correctly wrapped await
    {
      code: `
        import { action, wrap } from "@reatom/core";
        action(async () => {
          await wrap(Promise.resolve());
        });
      `,
    },
    // Correctly wrapped setTimeout
    {
      code: `
        import { action, wrap } from "@reatom/core";
        action(() => {
          setTimeout(wrap(() => {}), 0);
        });
      `,
    },
    // Correctly wrapped setInterval
    {
      code: `
        import { computed, wrap } from "@reatom/core";
        computed(() => {
          setInterval(wrap(() => {}), 0);
        });
      `,
    },
    // Correctly wrapped requestAnimationFrame
    {
      code: `
        import { effect, wrap } from "@reatom/core";
        effect(() => {
          requestAnimationFrame(wrap(() => {}));
        });
      `,
    },
    // Correctly wrapped in .extend(withSomething(...))
    {
      code: `
        import { atom, wrap } from "@reatom/core";
        // Assuming withSomething is a valid extension pattern
        const withSomething = (fn) => (target) => fn();
        const anAtom = atom(0);
        anAtom.extend(withSomething(async () => {
          await wrap(Promise.resolve());
          setTimeout(wrap(() => {}), 0);
        }));
      `,
    },
    // Operations outside Reatom contexts (no wrap needed by this rule)
    {
      code: `
        async function test() {
          await Promise.resolve();
        }
        setTimeout(() => {}, 0);
        setInterval(() => {}, 100);
        requestAnimationFrame(() => {});
      `,
    },
    // Not a reatom action, computed, or effect
    {
      code: `
        const myCustomAction = async () => {
          await Promise.resolve();
        };
        myCustomAction();
      `,
    },
    // .then with wrap
    {
      code: `
        import { action, wrap } from "@reatom/core";
        action(() => {
          Promise.resolve().then(wrap(() => { /* reatom stuff */ }));
        });
      `,
    },
    // Promise.all with wrap
    {
      code: `
        import { action, wrap } from "@reatom/core";
        action(async () => {
          await wrap(Promise.all([Promise.resolve(), Promise.resolve()]));
        });
      `,
    },
  ],
  invalid: [
    // --- await ---
    {
      code: `
        import { action } from "@reatom/core";
        action(async () => {
          await Promise.resolve();
        });
      `,
      output: `
        import { action, wrap } from "@reatom/core";
        action(async () => {
          await wrap(Promise.resolve());
        });
      `,
      errors: [{ messageId: 'awaitMissingWrap' }],
    },
    {
      code: `
        import { computed } from "@reatom/core";
        computed(async () => {
          await Promise.resolve();
        }, "myComputed");
      `,
      output: `
        import { computed, wrap } from "@reatom/core";
        computed(async () => {
          await wrap(Promise.resolve());
        }, "myComputed");
      `,
      errors: [{ messageId: 'awaitMissingWrap' }],
    },
    {
      code: `
        import { effect } from "@reatom/core";
        effect(async () => {
          await Promise.resolve();
        }, "myEffect");
      `,
      output: `
        import { effect, wrap } from "@reatom/core";
        effect(async () => {
          await wrap(Promise.resolve());
        }, "myEffect");
      `,
      errors: [{ messageId: 'awaitMissingWrap' }],
    },
    {
      code: `
        import { atom } from "@reatom/core";
        const withAsync = (fn) => (target) => fn(); // Mock extension
        const anAtom = atom(0);
        anAtom.extend(withAsync(async () => {
          await Promise.resolve();
        }));
      `,
      output: `
        import { atom, wrap } from "@reatom/core";
        const withAsync = (fn) => (target) => fn(); // Mock extension
        const anAtom = atom(0);
        anAtom.extend(withAsync(async () => {
          await wrap(Promise.resolve());
        }));
      `,
      errors: [{ messageId: 'awaitMissingWrap' }],
    },
    {
      code: `
        import { atom } from "@reatom/core";
        const anAtom = atom(0).actions(target => ({
          doAsync: async () => {
            await Promise.resolve();
          }
        }));
      `,
      output: `
        import { atom, wrap } from "@reatom/core";
        const anAtom = atom(0).actions(target => ({
          doAsync: async () => {
            await wrap(Promise.resolve());
          }
        }));
      `,
      errors: [{ messageId: 'awaitMissingWrap' }],
    },

    // --- setTimeout ---
    {
      code: `
        import { action } from "@reatom/core";
        action(() => {
          setTimeout(() => { console.log("timeout"); }, 100);
        });
      `,
      output: `
        import { action, wrap } from "@reatom/core";
        action(() => {
          setTimeout(wrap(() => { console.log("timeout"); }), 100);
        });
      `,
      errors: [
        { messageId: 'callbackMissingWrap', data: { name: 'setTimeout' } },
      ],
    },
    {
      code: `
        import { action } from "@reatom/core";
        function handleTimeout() { console.log("handler"); }
        action(() => {
          setTimeout(handleTimeout, 100);
        });
      `,
      output: `
        import { action, wrap } from "@reatom/core";
        function handleTimeout() { console.log("handler"); }
        action(() => {
          setTimeout(wrap(handleTimeout), 100);
        });
      `,
      errors: [
        { messageId: 'callbackMissingWrap', data: { name: 'setTimeout' } },
      ],
    },
    {
      code: `
        import { computed } from "@reatom/core";
        computed(() => {
          setTimeout(() => {}, 0);
        });
      `,
      output: `
        import { computed, wrap } from "@reatom/core";
        computed(() => {
          setTimeout(wrap(() => {}), 0);
        });
      `,
      errors: [
        { messageId: 'callbackMissingWrap', data: { name: 'setTimeout' } },
      ],
    },
    {
      code: `
        import { atom } from "@reatom/core";
        const withInit = (fn) => (target) => fn(); // Mock extension
        const anAtom = atom(0);
        anAtom.extend(withInit(() => {
          setTimeout(() => {}, 10);
        }));
      `,
      output: `
        import { atom, wrap } from "@reatom/core";
        const withInit = (fn) => (target) => fn(); // Mock extension
        const anAtom = atom(0);
        anAtom.extend(withInit(() => {
          setTimeout(wrap(() => {}), 10);
        }));
      `,
      errors: [
        { messageId: 'callbackMissingWrap', data: { name: 'setTimeout' } },
      ],
    },

    // --- setInterval ---
    {
      code: `
        import { action } from "@reatom/core";
        action(() => {
          setInterval(() => { console.log("interval"); }, 1000);
        });
      `,
      output: `
        import { action, wrap } from "@reatom/core";
        action(() => {
          setInterval(wrap(() => { console.log("interval"); }), 1000);
        });
      `,
      errors: [
        { messageId: 'callbackMissingWrap', data: { name: 'setInterval' } },
      ],
    },
    {
      code: `
        import { effect } from "@reatom/core";
        effect(() => {
          const intervalId = setInterval(() => {}, 100);
          return () => clearInterval(intervalId);
        });
      `,
      output: `
        import { effect, wrap } from "@reatom/core";
        effect(() => {
          const intervalId = setInterval(wrap(() => {}), 100);
          return () => clearInterval(intervalId);
        });
      `,
      errors: [
        { messageId: 'callbackMissingWrap', data: { name: 'setInterval' } },
      ],
    },

    // --- requestAnimationFrame ---
    {
      code: `
        import { action } from "@reatom/core";
        action(() => {
          requestAnimationFrame(() => { document.title = "new"; });
        });
      `,
      output: `
        import { action, wrap } from "@reatom/core";
        action(() => {
          requestAnimationFrame(wrap(() => { document.title = "new"; }));
        });
      `,
      errors: [
        {
          messageId: 'callbackMissingWrap',
          data: { name: 'requestAnimationFrame' },
        },
      ],
    },

    // --- queueMicrotask ---
    {
      code: `
        import { action } from "@reatom/core";
        action(() => {
          queueMicrotask(() => { console.log("microtask"); });
        });
      `,
      output: `
        import { action, wrap } from "@reatom/core";
        action(() => {
          queueMicrotask(wrap(() => { console.log("microtask"); }));
        });
      `,
      errors: [
        { messageId: 'callbackMissingWrap', data: { name: 'queueMicrotask' } },
      ],
    },

    // --- process.nextTick (Node.js specific) ---
    {
      code: `
        import { action } from "@reatom/core";
        action(() => {
          process.nextTick(() => { console.log("nextTick"); });
        });
      `,
      output: `
        import { action, wrap } from "@reatom/core";
        action(() => {
          process.nextTick(wrap(() => { console.log("nextTick"); }));
        });
      `,
      errors: [
        {
          messageId: 'callbackMissingWrap',
          data: { name: 'process.nextTick' },
        },
      ],
    },
  ],
})
