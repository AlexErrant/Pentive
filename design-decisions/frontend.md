# SolidJS

In order to allow UI plugins to manipulate the DOM as they please, the UI framework must not use a virtual DOM. This eliminates many UI frameworks, leaving Svelte, VanillaJS, and Solid.

VanillaJS was rejected because Alex is a terrible web dev. Solid was chosen because it's faster than Svelte. It also uses run-time reactivity, compared to Svelte's build-time, which _may_ have benefits when dynamically loading plugins. Solid is more like a library than Svelte - calling Solid functions (e.g. `createEffect`, `Dynamic`) is simple and can be done from within other UI frameworks. (To be clear, I haven't tried calling any Svelte functions from inside a Solid child component.) Finally, Solid's components are thin (they're functions that can return a DOM element), which makes it easy to inject third party plugin components.

There are many downsides to using Solid, including a less mature ecosystem. `hub` uses [Solid-Start](https://github.com/solidjs/solid-start) which is in beta. We'll see if I come to regret this decision.

# Plugins

Plugins work by swapping out registrations in the dependency injection container. A demo of the implementation can be found [here](../app/src/pluginManager.proofOfConcept.ts). I'm not overly fond of `bind(this)`; if anyone has a better design please let me know!

In the future, Pentive may try to provide better security by wrapping functionality in a sandboxed iframe. Until then, users must accept the risk that plugins may do nefarious things. Notably, it looks like [VS Code doesn't sandbox its plugins](https://stackoverflow.com/q/67493012), despite [the risk](https://snyk.io/blog/visual-studio-code-extension-security-vulnerabilities-deep-dive/) [[2]](https://www.reddit.com/r/vscode/comments/v0ak78/are_vs_code_plugins_safe/) [[3]](https://news.ycombinator.com/item?id=36029020), so perhaps I should tone down my paranoia. Certainly confining plugins to a browser environment is better than running arbitrary Python modules like Anki. It's a strict improvement.

Plugins are NPM packages. Specify the entry point with [main](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#main). Only _single file_ Javascript packages are supported. In other words, the entry point is the _only_ Javascript file - it doesn't import any Javascript from adjacent files. (If you feel like fixing this limitation, first open an issue with your proposed architecture. Grep the codebase for 2D96EE4E-61BA-4FCA-93C1-863C80E10A93.)

## Plugin Security

https://news.ycombinator.com/item?id=20770105
https://news.ycombinator.com/item?id=40897658
https://news.ycombinator.com/item?id=40898641
https://github.com/endojs/endo

# Security

`app.pentive.com` should contain no secrets. Auth will be managed via `HttpOnly` cookies. IndexedDB/SQLite will be hosted on `app.pentive.com` to allow direct plugin access.

If, in the future, threat modeling determines that some DB value must be protected, it can be hosted on `secure.pentive.com` in an iframe. Use Comlink to communicate with it. The most likely candidate is the Plugins table. Web workers don't work cross origin, but if someday we really want it on a background thread we can [embed a web worker in the iframe](https://stackoverflow.com/a/22151285) or [use a service worker in an iframe](https://stackoverflow.com/a/31883194).

## Comlink

[Comlink](https://github.com/GoogleChromeLabs/comlink) makes it easier to communicate with iframes, web workers, and service workers. Someday, [this](https://github.com/GoogleChromeLabs/comlink-loader) may be useful if we start using web workers. [1](https://advancedweb.hu/how-to-use-async-await-with-postmessage/), [2](https://github.com/Aaronius/penpal), or [3](https://github.com/dollarshaveclub/postmate) may be useful alternatives if Comlink does't suit our needs. Comlink was chosen because it had a nice TypeScript API.

# Rejected

- [Rescript](https://rescript-lang.org/) only supports React. Sadly [it seems unlikely](https://github.com/rescript-lang/rescript-compiler/issues/4783) that Rescript will support Solid. HyperScript is a possibility, but [it's ugly as sin](https://github.com/solidjs/solid/issues/245#issuecomment-719905295) and [not recommended for perf reasons](https://www.solidjs.com/docs/1.0.0#6.-i-really-dislike-jsx%2C-any-chance-of-a-template-dsl%3F-oh%2C-i-see-you-have-tagged-template-literals%2Fhyperscript.-maybe-i-will-use-those...).

- Javascript's [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) object for sandboxing plugins. While better than `eval`, it also suffers from [having no security model](https://stackoverflow.com/q/18060696).

# Undecided

Capacitor vs Electron vs Tauri. The only non-web API Pentive really need is filesystem access. This allows for importing Anki `apkg`s and automated creation of local backups. There will be perf/interop advantages when using SQLite that's on a real file system (compared to IndexedDB for wa-sqlite/crsqlite).
