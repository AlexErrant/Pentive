I apologize in advance for how time consuming setting up Pentive on your local machine may be. Getting HTTPS to work locally is the majority of the effort, so if you already know how to do that things will be easier.

# Steps

_All commands below should be run from the repo's root directory._

## 1. Prerequisites

- [Node](https://nodejs.org)
  - You should use a program like [nvm](https://github.com/nvm-sh/nvm) to install and manage the Node version.
- [pnpm](https://pnpm.io/)
  - You should use a program like [Corepack](https://nodejs.org/api/corepack.html) to install and manage the pnpm version. If you elect to use Corepack, run `corepack enable`.
- Linux. (I use WSL2 - I'm going to assume things Just Work for MacOS.)

### Optional-ish, but _highly_ recommended

These steps assume you've installed these or made the requisite accounts. If you deviate, you'll need to find workarounds.

- [Turso CLI](https://github.com/tursodatabase/turso-cli) or [`sqld` for libSQL](https://github.com/tursodatabase/libsql/tree/main/libsql-server)
  - Required if you want to run `hub` or `cwa`.
  - The Turso CLI requires a [Turso account](https://api.turso.tech/auth).
  - This repo's scripts assume you're using the Turso CLI, but you can use `sqld` by making appropriate substitutions.
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
  - Required if you want to deploy stuff or run Wrangler locally.
- [mkcert](https://github.com/FiloSottile/mkcert)
  - `app-ugc` uses a service worker to intercept and return assets (e.g. images). Service workers require HTTPS. We also use `__Secure-` prefixed cookies for auth.
  - If you're on WSL2, [do this](https://github.com/FiloSottile/mkcert/issues/357#issuecomment-1466762021).
  - Don't forget to run `mkcert -install`.

## 2. Install packages

```bash
pnpm i
```

## 3. Update your `hosts` file

Append the contents of `../devhosts` to your [hosts file](https://www.howtogeek.com/howto/27350/beginner-geek-how-to-edit-your-hosts-file/), e.g. `sudo tee -a /etc/hosts < devhosts`.

## 4. Generate secrets, config, and certs

From the the repo's root directory, run

```bash
mkdir ../PentiveSecrets
cp design-decisions/example.pentive.secrets.sh ../PentiveSecrets/secrets.sh
```

Secrets are stored outside the repo so [`git clean -fdx`](https://tysonwilliams.coding.blog/2020-07-11_systematic_cleaning#git-clean--fdx) may be safely run.

- Update `secrets.sh` with your values.
  - Replace the secrets using `openssl rand -base64 32`.
- Run `./mkenv.sh`. Rerun this if you ever make changes to `secrets.sh`.
- Run `./rmcert.sh && ./mkcert.sh`.

## 5. Update Ivy's schema

```bash
pnpm --filter shared-edge initIvy
```

## 6. Run!

```bash
pnpm ugc
```

And in another terminal:

```bash
pnpm dev
```

Visit https://pentive.localhost:3014/ and https://app.pentive.localhost:3013/

## 7. Deploy (optional)

For the initial deployment, you may need to `cd` to `/app`, `/app-ugc`, and `/hub-ugc`, then deploy each manually with `pnpm run build && wrangler pages deploy ./dist`. This is because `wrangler pages publish` requires that you go through 2 interactive prompts when creating a new project. After that, subsequent deployments may be run with

```bash
pnpm run deploy
```
