#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

source ../PentiveSecrets/secrets.sh

# Uncomment if you wanna
# echo $productionHubSessionSecret        | npx wrangler       secret put hubSessionSecret        --name cwa
# echo $productionTursoDbUrl              | npx wrangler       secret put tursoDbUrl              --name cwa
# echo $productionTursoAuthToken          | npx wrangler       secret put tursoAuthToken          --name cwa
# echo $productionPrivateMediaSecret      | npx wrangler       secret put privateMediaSecret      --name cwa
# echo $productionPeerSyncPublicKey       | npx wrangler       secret put peerSyncPublicKey       --name cwa
# echo $productionPeerSyncPrivateKey      | npx wrangler       secret put peerSyncPrivateKey      --name cwa
# echo $productionTursoDbUrl              | npx wrangler       secret put tursoDbUrl              --name api-ugc
# echo $productionTursoAuthToken          | npx wrangler       secret put tursoAuthToken          --name api-ugc
# echo $productionHubSessionSecret        | npx wrangler       secret put hubSessionSecret        --name api-ugc
# echo $productionHubSessionSecret        | npx wrangler pages secret put hubSessionSecret        --project-name hub
# echo $productionAlphaKey                | npx wrangler pages secret put alphaKey                --project-name hub
# echo $productionDiscordId               | npx wrangler pages secret put discordId               --project-name hub
# echo $productionDiscordSecret           | npx wrangler pages secret put discordSecret           --project-name hub
# echo $productionGithubId                | npx wrangler pages secret put githubId                --project-name hub
# echo $productionGithubSecret            | npx wrangler pages secret put githubSecret            --project-name hub
# echo $productionTursoDbUrl              | npx wrangler pages secret put tursoDbUrl              --project-name hub
# echo $productionTursoAuthToken          | npx wrangler pages secret put tursoAuthToken          --project-name hub
# echo $productionCsrfSecret              | npx wrangler pages secret put csrfSecret              --project-name hub
# echo $productionOauthStateSecret        | npx wrangler pages secret put oauthStateSecret        --project-name hub
# echo $productionOauthCodeVerifierSecret | npx wrangler pages secret put oauthCodeVerifierSecret --project-name hub
# echo $productionHubInfoSecret           | npx wrangler pages secret put hubInfoSecret           --project-name hub

# https://developers.cloudflare.com/workers/wrangler/configuration/#environmental-variables
# https://developers.cloudflare.com/workers/platform/environment-variables/#adding-secrets-via-wrangler

envsubst < ./cwa/.example.dev.vars                   > ./cwa/.dev.vars
envsubst < ./cwa/example.wrangler.toml               > ./cwa/wrangler.toml
envsubst < ./api-ugc/.example.dev.vars               > ./api-ugc/.dev.vars
envsubst < ./api-ugc/example.wrangler.toml           > ./api-ugc/wrangler.toml
envsubst < ./hub/.example.env                        > ./hub/.env
envsubst < ./hub/.example.env                        > ./hub/.dev.vars
envsubst < ./hub/.example.env.development            > ./hub/.env.development
envsubst < ./hub/.example.env.production             > ./hub/.env.production
envsubst < ./hub/example.wrangler.toml               > ./hub/wrangler.toml
envsubst < ./lrpc/.example.env                       > ./lrpc/.env
envsubst < ./app-ugc/example.env.sh                  > ./app-ugc/env.sh
envsubst < ./hub-ugc/example.env.sh                  > ./hub-ugc/env.sh
envsubst < ./app/example.env.sh                      > ./app/env.sh
envsubst < ./app/.example.env.test                   > ./app/.env.test
envsubst < ./app/.example.env.development            > ./app/.env.development
envsubst < ./app/.example.env.production             > ./app/.env.production
envsubst < ./app-playwright/.example.env.test        > ./app-playwright/.env.test
envsubst < ./app-playwright/.example.env.development > ./app-playwright/.env.development
