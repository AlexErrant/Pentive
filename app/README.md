## Getting Started

Add the following to your [hosts file](https://www.howtogeek.com/howto/27350/beginner-geek-how-to-edit-your-hosts-file/):

```
127.0.0.1 app.local.pentive.com
127.0.0.1 secure.local.pentive.com
127.0.0.1 user-generated-content.local.pentive.com
```

This is to give the `/secure` directory/path the _appearance_ of a different origin, which is necessary for `iframe` security. Someday I may figure out how to make Vite serve two domains with a simple `npm run dev`, but for now I'm avoiding running `npm run dev & npm run dev-secure` because I'm lazy. Based off [this](https://www.gosink.in/vue-js-how-to-handle-multiple-subdomains-on-a-single-app/).

Install [`pnpm`](https://pnpm.io/) then run:

```bash
$ pnpm install && npm run dev
```
