# SolidJS
In order to allow UI plugins to manipulate the DOM as they please, the UI framework must not use a virtual DOM. This eliminates many UI frameworks, leaving Svelte, VanillaJS, and Solid.

Solid was chosen because it was faster than Svelte. (VanillaJS was rejected because Alex is a terrible web dev.) Students, particularly in less developed countries, have less powerful devices. There is absoslutely no reason that a flashcard should be laggy - even on the most basic systems. Users may also use many plugins, which will likely use different UI frameworks. Having a fast base UI framework will serve as a solid foundation for other UI components.

There are many downsides to using Solid, including questionable SSR and a less mature ecosystem. The `app` doesn't need SSR, and custom elements allow us to steal components from other frameworks. This reasoning doesn't apply to the `hub`. Despite this, I intend to use SolidJS there as well for consistency - we'll see if I come to regret this decision. [Solid's metaframework](https://github.com/solidjs/solid-start), like [Svelte's](https://kit.svelte.dev/), is not production ready, though it looks like Kit will hit 1.0 soon.

# Plugins
UI plugins are supporting using [custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements). A significant drawback, however, is that [custom elements have no security model](https://stackoverflow.com/q/45282601).

Function plugins will be executed using Javascript's [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) object. While better than `eval`, it also suffers from having no security model.

In the future, Pentive may try to provide better security by wrapping the custom element or function in a sandboxed iframe. Until then, users must accept the risk that plugins may do nefarious things.

# Security
IndexedDB and other secrets are managed from an `iframe`, which is served from `secure.*.pentive.com` to block plugin access. Web workers don't work cross origin, but if someday we really want it on a background thread we can [embed a web worker in the iframe](https://stackoverflow.com/a/22151285) or [use a service worker in an iframe](https://stackoverflow.com/a/31883194).

## Comlink
[Comlink](https://github.com/GoogleChromeLabs/comlink) makes it easier to communicate with iframes and web workers. Someday, [this](https://github.com/GoogleChromeLabs/comlink-loader) may be useful if we start using web workers. [1](https://advancedweb.hu/how-to-use-async-await-with-postmessage/), [2](https://github.com/Aaronius/penpal), or [3](https://github.com/dollarshaveclub/postmate) may be useful alternatives if Comlink does't suit our needs. Comlink was chosen because it had a nice TypeScript API.

# Rejected
* [Rescript](https://rescript-lang.org/) only supports React. Sadly [it seems unlikely](https://github.com/rescript-lang/rescript-compiler/issues/4783) that Rescript will support Solid. HyperScript is a possibility, but [it's ugly as sin](https://github.com/solidjs/solid/issues/245#issuecomment-719905295) and [not recommended for perf reasons](https://www.solidjs.com/docs/1.0.0#6.-i-really-dislike-jsx%2C-any-chance-of-a-template-dsl%3F-oh%2C-i-see-you-have-tagged-template-literals%2Fhyperscript.-maybe-i-will-use-those...).

# Undecided
Capacitor vs Electron vs Tauri. The only non-web API Pentive really need is filesystem access. This allows for importing Anki `apkg`s and automated creation of local backups. There may be perf advantages to moving to SQLite.
