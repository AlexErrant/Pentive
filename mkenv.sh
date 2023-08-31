#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

source ../PentiveSecrets/secrets.sh

# Uncomment if you wanna
# echo $productionHubSessionSecret        | npx wrangler secret put hubSessionSecret        --name cwa
# echo $productionPlanetscaleDbUrl        | npx wrangler secret put planetscaleDbUrl        --name cwa
# echo $productionMediaTokenSecret        | npx wrangler secret put mediaTokenSecret        --name cwa
# echo $productionAppOrigin               | npx wrangler secret put appOrigin               --name cwa
# echo $productionHubOrigin               | npx wrangler secret put hubOrigin               --name cwa
# echo $productionPeerSyncPublicKey       | npx wrangler secret put peerSyncPublicKey       --name cwa
# echo $productionPeerSyncPrivateKey      | npx wrangler secret put peerSyncPrivateKey      --name cwa
# echo $productionPlanetscaleDbUrl        | npx wrangler secret put planetscaleDbUrl        --name api-ugc
# echo $productionAppOrigin               | npx wrangler secret put appOrigin               --name api-ugc
# echo $productionHubOrigin               | npx wrangler secret put hubOrigin               --name api-ugc
# echo $productionHubSessionSecret        | npx wrangler secret put hubSessionSecret        --name api-ugc
# echo $productionHubSessionSecret        | npx wrangler secret put hubSessionSecret        --name hub
# echo $productionAlphaKey                | npx wrangler secret put alphaKey                --name hub
# echo $productionDiscordId               | npx wrangler secret put discordId               --name hub
# echo $productionDiscordSecret           | npx wrangler secret put discordSecret           --name hub
# echo $productionGithubId                | npx wrangler secret put githubId                --name hub
# echo $productionGithubSecret            | npx wrangler secret put githubSecret            --name hub
# echo $productionPlanetscaleDbUrl        | npx wrangler secret put planetscaleDbUrl        --name hub
# echo $productionCsrfSecret              | npx wrangler secret put csrfSecret              --name hub
# echo $productionOauthStateSecret        | npx wrangler secret put oauthStateSecret        --name hub
# echo $productionOauthCodeVerifierSecret | npx wrangler secret put oauthCodeVerifierSecret --name hub
# echo $productionHubInfoSecret           | npx wrangler secret put hubInfoSecret           --name hub

# https://developers.cloudflare.com/workers/wrangler/configuration/#environmental-variables
# https://developers.cloudflare.com/workers/platform/environment-variables/#adding-secrets-via-wrangler

envsubst < ./cwa/.example.dev.vars            > ./cwa/.dev.vars
envsubst < ./cwa/example.wrangler.toml        > ./cwa/wrangler.toml
envsubst < ./api-ugc/.example.dev.vars        > ./api-ugc/.dev.vars
envsubst < ./api-ugc/example.wrangler.toml    > ./api-ugc/wrangler.toml
envsubst < ./hub/.example.env                 > ./hub/.env
envsubst < ./hub/.example.env.development     > ./hub/.env.development
envsubst < ./hub/.example.env.production      > ./hub/.env.production
envsubst < ./hub/example.wrangler.toml        > ./hub/wrangler.toml
envsubst < ./lrpc/.example.env                > ./lrpc/.env
envsubst < ./app-ugc/example.env.sh           > ./app-ugc/env.sh
envsubst < ./hub-ugc/example.env.sh           > ./hub-ugc/env.sh
envsubst < ./hub-ugc/.example.env.development > ./hub-ugc/.env.development
envsubst < ./hub-ugc/.example.env.production  > ./hub-ugc/.env.production
envsubst < ./app/example.env.sh               > ./app/env.sh
envsubst < ./app/.example.env.development     > ./app/.env.development
envsubst < ./app/.example.env.production      > ./app/.env.production
