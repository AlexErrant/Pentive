⚠ This file is called `run-locally`, but there is an online-only dependency: [PlanetScale](https://planetscale.com/). You could spin up a MySQL Docker and change the Kysely dialect from PlanetScale to MySQL, but I don't recommend this; I'm not even sure if a locally running Cloudflare Worker can connect to MySQL. ⚠

# Prerequisites:

- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [pnpm](https://pnpm.io/)
- Linux. (I use WSL2 - I'm going to assume things Just Work for MacOS.)

## Optional-ish

- [PlanetScale account](https://auth.planetscale.com/sign-up)
  - Required if you want to run `hub`. They have a [_stupidly_ good free tier](https://planetscale.com/pricing) that doesn't need a credit card and doesn't expire like AWS's 12 month free tier.
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
  - Required if you want to deploy stuff. They also have a [stupidly good free tier](https://developers.cloudflare.com/workers/platform/pricing/). If you want to run things locally, use [Miniflare](https://miniflare.dev/).
- [mkcert](https://github.com/FiloSottile/mkcert)
  - `app-ugc` uses a service worker to intercept and return assets (e.g. images). Service workers require HTTPS. We also use `__Secure-` prefixed cookies for auth.

# Steps

_All commands below should be run from the repo's root directory._

## 1. Install everything above

## 2. Update your `hosts` file

Add the following to your [hosts file](https://www.howtogeek.com/howto/27350/beginner-geek-how-to-edit-your-hosts-file/):

```
127.0.0.1 app.pentive.local
127.0.0.1 app-user-generated-content.pentive.local
127.0.0.1 pentive.local
127.0.0.1 hub-user-generated-content.pentive.local
127.0.0.1 lrpc.pentive.local
127.0.0.1 cwa.pentive.local
127.0.0.1 peer.pentive.local
```

## 3. Generate certs

Run `./rmcert.sh && ./mkcert.sh`.

⚠ Note that `rmcert.sh` deletes Wrangler's local-cert's `key.pem` and `cert.pem`. (Then `mkcert.sh` generates a new one.) This "regenerate" may be undesirable if you're using Wrangler for HTTPS anywhere else. If this is the case, add your site to `mkcert.sh` before running it, e.g.

```bash
mkcert -key-file key.pem -cert-file cert.pem cwa.pentive.local your-wrangler-worker-here.com
```

[More info.](https://github.com/cloudflare/workers-sdk/issues/1908#issuecomment-1416901172) ⚠

If you're on WSL2, [do this](https://github.com/FiloSottile/mkcert/issues/357#issuecomment-1466762021).

## 4. Generate secrets

From the the repo's root directory, run

```bash
mkdir ../PentiveSecrets
cp design-decisions/example.pentive.secrets.sh ../PentiveSecrets/secrets.sh
```

Secrets are stored outside the repo so [`git clean -fdx`](https://tysonwilliams.coding.blog/2020-07-11_systematic_cleaning#git-clean--fdx) may be safely run.

- Update `secrets.sh` with your values.
  - Replace the secrets using `openssl rand -base64 32`.
- Run `./make.sh`.

## 5. Install

```bash
pnpm i
```

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

Visit https://pentive.local:3014/ and https://app.pentive.local:3013/

## 8. Deploy (optional)

For the initial deployment, you may need to `cd` to `/app`, `/app-ugc`, and `/hub-ugc`, then deploy each manually with `pnpm run build && wrangler pages publish ./dist`. This is because `wrangler pages publish` requires that you go through 2 interactive prompts when creating a new project. After that, subsequent deployments may be run with

```bash
pnpm run deploy
```
