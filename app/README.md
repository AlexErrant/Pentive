## Getting Started

Add the following to your [hosts file](https://www.howtogeek.com/howto/27350/beginner-geek-how-to-edit-your-hosts-file/):

```
127.0.0.1 app.local.pentive.com
127.0.0.1 user-generated-content.local.pentive.com
```

Install [`pnpm`](https://pnpm.io/) then run:

```bash
$ pnpm install && npm run dev
```

## Generate types for sqlite

```sh
npx kysely-codegen --out-file './src/sqlite/database.ts' --url "./pentiveapp.sqlite"
```
