---
title: History
description: The history of Reatom
---

## Zen

- **Good primitive is more than a framework**
- **Composition beats configuration**
- **General semantic should be implicit, specific semantic should be explicit**

## FAQ

### Why immutability?

Immutable data is more predictable and easier to debug than mutable states and their wrappers.
Reatom is specifically designed to focus on [simple debugging of asynchronous chains](/getting-started/debugging/) and offers [patterns](/recipes/atomization/) to achieve [excellent performance](#how-performant-reatom-is).

### What LTS policy is used and what about bus factor?

Reatom is built for the long haul.
We dropped our first Long Term Support (LTS) version (v1) in [December 2019](https://github.com/reatom/reatom/releases/tag/v1.0).
In 2022, we introduced breaking changes with a new LTS (v3) version.
Don't worry — we've got you covered with this [Migration guide](/compat/core-v1#migration-guide).
We're not stopping our three years of solid support — it's ongoing with our [adapter package](/compat/core-v1).
We hope this proves how committed we are to our users.

Right now, our dev team consists of four people: [@artalar](https://github.com/artalar) and [@krulod](https://github.com/krulod) handle the core features, while [@BANOnotIT](https://github.com/BANOnotIT) and [@Akiyamka](https://github.com/Akiyamka) take care of documentation and issue management.
We also have [many contributors](https://github.com/reatom/reatom/graphs/contributors) working on different packages.

### What build target and browser support?

All our packages are set up using [Browserslist's "last 1 year" query](https://browsersl.ist/#q=last+1+year).
To support older environments, you must handle the transpilation by yourself.
Our builds come in two output formats: CJS (`exports.require`, `main`) and ESM (`exports.default`, `module`).
For more details, check out the `package.json` file.

### How performant Reatom is?

Check out this [benchmark](https://github.com/artalar/reactive-computed-bench) for complex computations across different state managers.
Remember that Reatom uses immutable data structures, operates in a separate context (DI-like), and maintains [atomicity](/handbook#data-consistency).
That means the Reatom test covers more features than other state manager tests.
Still, Reatom performs faster than MobX for mid-range numbers, which is pretty impressive.

Also, remember to check out our [atomization guide](/recipes/atomization).

### Limitations

No software is perfect, and Reatom is no exception. Here are some limitations you should be aware of:

- **Immutable Data**: While immutable data structures are great, they can impact performance. In critical situations, think carefully about your data structures. The good news is you [don't have to use normalization](/recipes/atomization).
- **Laziness**: Laziness is less obvious sometimes and might lead to missed updates. However, debugging a missing update is straightforward and often easier than dealing with hot observables' memory leaks and performance issues. We also have [hooks](/package/hooks) for hot linking.
- **Error Handling**: Currently, you can't subscribe to errors from any dependency, but we're working on it. In [reatomAsync](/package/async), passed effects are wrapped in an error handler, allowing you to manage errors, but you need to wrap them explicitly.
- **Asynchronous Transactions**: Asynchronous transactions are not supported yet, but they're in the works. This feature will simplify building optimistic UIs and improve UX significantly.
- **Ecosystem and Utilities**: While we have many utilities and a growing ecosystem, our goal is to provide well-designed logic primitives. Reatom sits between a library and a framework, embracing procedural programming with minimal extra API and semantic overhead. Our defaults, such as immutability, laziness, transactions, and the separation of pure computations and effects, are designed to help you write better code.

### Media

- [en twitter](https://twitter.com/ReatomJS)
- [en discord](https://discord.gg/EPAKK5SNFh)
- [en github discussion](https://github.com/reatom/reatom/discussions)
- [ru telegram](https://t.me/reatom_ru)
- [ru youtube](https://www.youtube.com/playlist?list=PLXObawgXpIfxERCN8Lqd89wdsXeUHm9XU)
