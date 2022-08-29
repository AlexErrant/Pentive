## Architecture

Pentive has an extremely powerful plugin system. There is literally no limit to modding the UI. Any default UI component (I'm using SolidJS) may be overwritten with a [custom element](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements). A significant drawback, however, is that [custom elements have no security model](https://stackoverflow.com/q/45282601). In the future, we may try to provide better security by wrapping the element in a sandboxed iframe. Until then, users must accept the risk that plugins may do nefarious things.

IndexedDB and other secrets are managed from an `iframe`, which is served from `secure.*.pentive.com` to block plugin access. Web workers don't work cross origin, but if someday we really want it on a background thread we can [embed a web worker in the iframe](https://stackoverflow.com/a/22151285) or [use a service worker in an iframe](https://stackoverflow.com/a/31883194).

<details>
  <summary>Implementation notes</summary>

[This](https://github.com/GoogleChromeLabs/comlink-loader) may be useful if/when we start using web workers.
[1](https://advancedweb.hu/how-to-use-async-await-with-postmessage/), [2](https://github.com/Aaronius/penpal), or [3](https://github.com/dollarshaveclub/postmate) may be useful alternatives if Comlink does't suit our needs. Comlink was chosen because it had a nice TypeScript API.

</details>
