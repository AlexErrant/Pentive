#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

source ../PentiveSecrets/secrets.sh

# Uncomment if you wanna
# echo $jwsSecret        | wrangler secret put jwsSecret        --name mediarouter
# echo $planetscaleDbUrl | wrangler secret put planetscaleDbUrl --name mediarouter
# echo $appMediaIdSecret | wrangler secret put appMediaIdSecret --name mediarouter
# echo $jwsSecret        | wrangler secret put jwsSecret        --name hub
# echo $planetscaleDbUrl | wrangler secret put planetscaleDbUrl --name hub
# echo $hubSessionSecret | wrangler secret put hubSessionSecret --name hub

# https://developers.cloudflare.com/workers/wrangler/configuration/#environmental-variables
# https://developers.cloudflare.com/workers/platform/environment-variables/#adding-secrets-via-wrangler

envsubst < ./mediaRouter/.example.dev.vars     > ./mediaRouter/.dev.vars
envsubst < ./mediaRouter/example.wrangler.toml > ./mediaRouter/wrangler.toml
envsubst < ./hub/.example.env                  > ./hub/.env
envsubst < ./hub/example.wrangler.toml         > ./hub/wrangler.toml
envsubst < ./lrpc/.example.env                 > ./lrpc/.env
