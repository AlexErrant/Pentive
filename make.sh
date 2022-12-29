#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

# https://www.scottbrady91.com/jose/jwts-which-signing-algorithm-should-i-use
# Ed448 doesn't work on cloudflare, but that's okay. https://soatok.blog/2022/05/19/guidance-for-choosing-an-elliptic-curve-signature-algorithm-in-2022/
openssl genpkey -algorithm ed25519 -out jwsPrivateKey.key
openssl pkey -in jwsPrivateKey.key -pubout -out jwsPublicKey.pem
export jwsPublicKey=$(<jwsPublicKey.pem)
export jwsPrivateKey=$(<jwsPrivateKey.key)

export appMediaIdSecret=$(openssl rand -base64 32)

source ../PentiveSecrets/secrets.sh

# Uncomment if you wanna
# echo $jwsPublicKey     | wrangler secret put jwsPublicKey     --name mediarouter
# echo $jwsPrivateKey    | wrangler secret put jwsPrivateKey    --name mediarouter
# echo $planetscaleDbUrl | wrangler secret put planetscaleDbUrl --name mediarouter
# echo $appMediaIdSecret | wrangler secret put appMediaIdSecret --name mediarouter

envsubst < ./mediaRouter/.example.dev.vars     > ./mediaRouter/.dev.vars
envsubst < ./mediaRouter/example.wrangler.toml > ./mediaRouter/wrangler.toml
envsubst < ./hub/example.wrangler.toml         > ./hub/wrangler.toml
envsubst < ./lrpc/.example.env                 > ./lrpc/.env
