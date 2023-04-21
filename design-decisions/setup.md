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

- [PlanetScale account](https://auth.planetscale.com/sign-up)
  - Required if you want to run `hub`. They have a [_stupidly_ good free tier](https://planetscale.com/pricing) that doesn't need a credit card and doesn't expire like AWS's 12 month free tier.
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
  - Required if you want to deploy stuff or run Wrangler locally. They also have a [stupidly good free tier](https://developers.cloudflare.com/workers/platform/pricing/).
- [mkcert](https://github.com/FiloSottile/mkcert)
  - `app-ugc` uses a service worker to intercept and return assets (e.g. images). Service workers require HTTPS. We also use `__Secure-` prefixed cookies for auth.
  - If you're on WSL2, [do this](https://github.com/FiloSottile/mkcert/issues/357#issuecomment-1466762021).
  - Don't forget to run `mkcert -install`.

## 2. Install packages

```bash
pnpm i
```

## 3. Update your `hosts` file

Add the following to your [hosts file](https://www.howtogeek.com/howto/27350/beginner-geek-how-to-edit-your-hosts-file/):

```
127.0.0.1 app.pentive.localhost
127.0.0.1 app-user-generated-content-pentive.localhost
127.0.0.1 pentive.localhost
127.0.0.1 hub-user-generated-content-pentive.localhost
127.0.0.1 lrpc.pentive.localhost
127.0.0.1 cwa.pentive.localhost
127.0.0.1 peer.pentive.localhost
127.0.0.1 user-generated-content-pentive.localhost
::1 app.pentive.localhost
::1 app-user-generated-content.pentive.localhost
::1 pentive.localhost
::1 hub-user-generated-content.pentive.localhost
::1 lrpc.pentive.localhost
::1 cwa.pentive.localhost
::1 peer.pentive.localhost
::1 user-generated-content-pentive.localhost
```

## 4. Generate secrets and config

From the the repo's root directory, run

```bash
mkdir ../PentiveSecrets
cp design-decisions/example.pentive.secrets.sh ../PentiveSecrets/secrets.sh
```

Secrets are stored outside the repo so [`git clean -fdx`](https://tysonwilliams.coding.blog/2020-07-11_systematic_cleaning#git-clean--fdx) may be safely run.

- Update `secrets.sh` with your values.
  - Replace the secrets using `openssl rand -base64 32`.
- Run `./mkenv.sh`. Rerun this if you ever make changes to `secrets.sh`.

## 5. Generate certs

- Run `pnpm --filter cwa dev`. This ensures that Wrangler has a self-signed certificate - you can kill Wrangler pretty much immediately.

- Run `./rmcert.sh && ./mkcert.sh`.

> **Warning** _Both_ scripts expect the Wrangler key/cert to exist at `~/.wrangler/local-cert/` or `${XDG_CONFIG_HOME:-$HOME/.config}/.wrangler/local-cert/`. If the key/cert doesn't exist in either location, [open an issue!](https://github.com/AlexErrant/Pentive/issues/new)

> [`rmcert.sh`](../rmcert.sh) deletes Wrangler's local-cert's `key.pem` and `cert.pem`. (Then [`mkcert.sh`](../mkcert.sh) generates a new one.) This "regenerate" may be undesirable if you're using Wrangler for HTTPS anywhere else. If this is the case, add your site to `mkcert.sh` before running it, e.g. `mkcert -key-file key.pem -cert-file cert.pem user-generated-content-pentive.localhost cwa.pentive.localhost your-wrangler-worker-here.com`

> [More info.](https://github.com/cloudflare/workers-sdk/issues/1908#issuecomment-1416901172) Note that `NODE_EXTRA_CA_CERTS` isn't helpful since it specifies a [CA cert](https://discord.com/channels/595317990191398933/799437470004412476/1039744087672238110) and we need to trust domains remapped in our `hosts` file.

## 6. Update PlanetScale schema

```bash
pnpm --filter lrpc dbpush
```

## 7. Run!

```bash
pnpm ugc
```

And in another terminal:

```bash
pnpm dev
```

Visit https://pentive.localhost:3014/ and https://app.pentive.localhost:3013/

## 8. Deploy (optional)

For the initial deployment, you may need to `cd` to `/app`, `/app-ugc`, and `/hub-ugc`, then deploy each manually with `pnpm run build && wrangler pages publish ./dist`. This is because `wrangler pages publish` requires that you go through 2 interactive prompts when creating a new project. After that, subsequent deployments may be run with

```bash
pnpm run deploy
```
