---
title: History
description: The history of Reatom
---

## Zen

- **Good primitive is more than a framework**
- **Composition beats configuration**
- **Explicit specific semantic, implicit general semantic**

## Goal

The main goal of Reatom is to be the best universal state manager for any kind of application. We believe that UX is a pillar of a good app, and great UX is built from a set of complex local states, so Reatom is a tool to manage it properly.

## Evolution

Reatom is built for the long haul.
We dropped our first Long Term Support (LTS) version (v1) in [December 2019](https://github.com/reatom/reatom/releases/tag/v1.0). And it was supported for a half of decade. We are always open to issues and PRs for older versions, if it will help you!

We have [a lot of contributors](https://github.com/reatom/reatom/graphs/contributors) working on different packages. We are trying to build a super stable and predictable ecosystem. To achieve this, we welcome you to put your package into our monorepo and check the [contribution](/contributing) guidelines.

Since the 1k version (`1000`), Reatom uses epoch-based versioning inspired by Antfu's post. The next epoch release (`2000`) will be in 2026-2027 and may include meaningful changes; the whole ecosystem will be migrated together with the core package. The classic major versions (`1001`, `1002`, `1042`) and other minor and patch versions follow standard SemVer and represent small changes in a general epoch context. `@alpha` tags denote pre-release versions.

## How performant Reatom is?

Reatom has best possible performance according to its features! The more complex your application, the faster Reatom will be compared to competitors.

Check out this [benchmark](https://github.com/artalar/reactive-computed-bench) for complex computations across different state managers.
Note that Reatom uses immutable data structures and operates in a separate async context, which bring a lot of features, which will take too many overhead with other set of tools. That means the Reatom test covers more features than other state manager tests
Still, Reatom performs faster than MobX for mid-range numbers, which is pretty impressive.

Also, remember to check out our [atomization guide](/recipes/atomization).

### Why not Proxy?

Proxy is a common pattern for working with signals, but it could be pretty messy in a scale. Atomization, as Reatom employs it, offers several advantages over Proxy-based reactivity:

- **Explicit Reactivity**: With atomization, it's always clear what is reactive and what isn't - hover a property and you get a type-hint. Proxies can make reactivity implicit and harder to trace in your codebase.
- **Simplified Debugging**: Mutable structures, often used with Proxies, are inherently more complex to debug, especially in asynchronous scenarios. Atomization, combined with Reatom's immutable approach, provides a clearer path for inspecting state changes and understanding data flow. You're also less likely to encounter situations requiring a `toJS`-like conversion (common in MobX) to inspect or pass data.
- **Controlled Performance**: While a direct Proxy interface might seem lightweight, it still heavier than an atom function call. But the real performance challenge arises from the often-uncontrolled creation of reactive structures. Atomization gives you fine-grained control, allowing you to define reactive elements precisely where needed, avoiding unnecessary overhead.

Also, with `@reatom/zod`, you can create safer reactive structures even shorter than with Proxy.

## Media

- [en twitter](https://twitter.com/ReatomJS)
- [en discord](https://discord.gg/EPAKK5SNFh)
- [en github discussion](https://github.com/reatom/reatom/discussions)
- [ru telegram](https://t.me/reatom_ru)
