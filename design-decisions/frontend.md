# SolidJS

In order to allow UI plugins to manipulate the DOM as they please, the UI framework must not use a virtual DOM. This eliminates many UI frameworks, leaving Svelte, VanillaJS, and Solid.

Solid was chosen because it was faster than Svelte. (VanillaJS was rejected because Alex is a terrible web dev.) Students, particularly in less developed countries, have less powerful devices. There is absolutely no reason that a flashcard should be slow - even on the most basic systems. Users may also use many plugins, which will likely use different UI frameworks. Having a fast base UI framework will serve as a solid foundation for other UI components. Also, there are a few minor quirks with Svelte's custom element support [1](https://github.com/sveltejs/svelte/issues/3852), [2](https://blog.logrocket.com/build-web-components-svelte/#:~:text=my%2Dcard%3E-,Major%20drawbacks,-We%E2%80%99ve%20just%20learned), though [this](https://github.com/sveltejs/svelte/issues/1748) was the largest problem, since it means that it would be impossible to build the default UI out of custom elements - they would need to be _web components_. In contrast, ["Solid was born with the desire to have Web Components as first class citizens"](https://www.solidjs.com/guides/getting-started#web-components:~:text=Solid%20was%20born%20with%20the%20desire%20to%20have%20Web%20Components%20as%20first%20class%20citizens), and it shows.

There are many downsides to using Solid, including questionable SSR and a less mature ecosystem. The `app` doesn't need SSR, and custom elements allow us to steal components from other frameworks. Notably, this reasoning does _not_ apply to the `hub`. Despite this, I intend to use SolidJS there as well for consistency - we'll see if I come to regret this decision. [Solid's meta-framework](https://github.com/solidjs/solid-start), like [Svelte's](https://kit.svelte.dev/), is not production ready, though it looks like Kit will hit 1.0 soon.

# Plugins

UI plugins are supporting using [custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements). A significant drawback, however, is that [custom elements have no security model](https://stackoverflow.com/q/45282601).

Function plugins will be executed using Javascript's [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) object. While better than `eval`, it also suffers from [having no security model](https://stackoverflow.com/q/18060696).

In the future, Pentive may try to provide better security by wrapping the custom element or function in a sandboxed iframe. Until then, users must accept the risk that plugins may do nefarious things. Notably, it looks like [VS Code doesn't sandbox its plugins](https://stackoverflow.com/q/67493012), despite [the risk](https://snyk.io/blog/visual-studio-code-extension-security-vulnerabilities-deep-dive/), so perhaps I should tone down my paranoia. Certainly confining plugins to a browser environment is better than running arbitrary Python modules like Anki. It's a strict improvement.

# Security

`app.pentive.com` should contain no secrets. Auth will be managed via `HttpOnly` cookies. IndexedDB/SQLite will be hosted on `app.pentive.com` to allow direct plugin access.

If, in the future, threat modeling determines that some DB value must be protected, it can be hosted on `secure.pentive.com` in an iframe. Use Comlink to communicate with it. The most likely candidate is the Plugins table. Web workers don't work cross origin, but if someday we really want it on a background thread we can [embed a web worker in the iframe](https://stackoverflow.com/a/22151285) or [use a service worker in an iframe](https://stackoverflow.com/a/31883194).

## Comlink

[Comlink](https://github.com/GoogleChromeLabs/comlink) makes it easier to communicate with iframes and web workers. Someday, [this](https://github.com/GoogleChromeLabs/comlink-loader) may be useful if we start using web workers. [1](https://advancedweb.hu/how-to-use-async-await-with-postmessage/), [2](https://github.com/Aaronius/penpal), or [3](https://github.com/dollarshaveclub/postmate) may be useful alternatives if Comlink does't suit our needs. Comlink was chosen because it had a nice TypeScript API.

# Rejected

- [Rescript](https://rescript-lang.org/) only supports React. Sadly [it seems unlikely](https://github.com/rescript-lang/rescript-compiler/issues/4783) that Rescript will support Solid. HyperScript is a possibility, but [it's ugly as sin](https://github.com/solidjs/solid/issues/245#issuecomment-719905295) and [not recommended for perf reasons](https://www.solidjs.com/docs/1.0.0#6.-i-really-dislike-jsx%2C-any-chance-of-a-template-dsl%3F-oh%2C-i-see-you-have-tagged-template-literals%2Fhyperscript.-maybe-i-will-use-those...).

# Undecided

Capacitor vs Electron vs Tauri. The only non-web API Pentive really need is filesystem access. This allows for importing Anki `apkg`s and automated creation of local backups. There may be perf/interop advantages with moving to SQLite.
