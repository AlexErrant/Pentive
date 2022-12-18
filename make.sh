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

envsubst < ./mediaRouter/.example.dev.vars > ./mediaRouter/.dev.vars

echo $jwsPublicKey | wrangler secret put jwsPublicKey --name mediarouter
echo $jwsPrivateKey | wrangler secret put jwsPrivateKey --name mediarouter
