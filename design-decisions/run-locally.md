Add the following to your [hosts file](https://www.howtogeek.com/howto/27350/beginner-geek-how-to-edit-your-hosts-file/):

```
127.0.0.1 app.pentive.local
127.0.0.1 user-generated-content.pentive.local
127.0.0.1 pentive.local
127.0.0.1 hub-user-generated-content.pentive.local
127.0.0.1 lrpc.pentive.local
127.0.0.1 api.pentive.local
```

Install [`pnpm`](https://pnpm.io/) then run:

```bash
$ pnpm install && npm run dev
```