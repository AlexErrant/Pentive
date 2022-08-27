## Getting Started

Add the following to your [hosts file](https://www.howtogeek.com/howto/27350/beginner-geek-how-to-edit-your-hosts-file/):

```
127.0.0.1 secure.local.pentive.com
```

This is to give the `/secure` directory/path the _appearance_ of a different origin, which is necessary for `iframe` security. Someday I may figure out how to make Vite serve two domains with a simple `npm run dev`, but for now I'm avoiding running `npm run dev & npm run dev-secure` because I'm lazy. Based off [this](https://www.gosink.in/vue-js-how-to-handle-multiple-subdomains-on-a-single-app/).

Install [`pnpm`](https://pnpm.io/) then run:

```bash
$ pnpm install && npm run dev
```

## Architecture

Pentive has an extremely powerful plugin system. There is literally no limit to modding the UI. Any default UI component (I'm using SolidJS) may be overwritten with another custom [Web Component](https://developer.mozilla.org/en-US/docs/Web/Web_Components). However, [Web Components have no security model](https://stackoverflow.com/q/45282601).

IndexedDB and other secrets are managed from an `iframe`, which is served from `secure.*.pentive.com` to block plugin access. Web workers don't work cross origin, but if someday we really want it on a background thread we can [embed a web worker in the iframe](https://stackoverflow.com/a/22151285) or [use a service worker in an iframe](https://stackoverflow.com/a/31883194).

<details>
  <summary>Implementation notes</summary>

[This](https://github.com/GoogleChromeLabs/comlink-loader) may be useful if/when we start using web workers.
[1](https://advancedweb.hu/how-to-use-async-await-with-postmessage/), [2](https://github.com/Aaronius/penpal), or [3](https://github.com/dollarshaveclub/postmate) may be useful alternatives if Comlink does't suit our needs.

</details>
