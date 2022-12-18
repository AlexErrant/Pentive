#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

# https://www.scottbrady91.com/jose/jwts-which-signing-algorithm-should-i-use
# Ed448 doesn't work on cloudflare, but that's okay. https://soatok.blog/2022/05/19/guidance-for-choosing-an-elliptic-curve-signature-algorithm-in-2022/
openssl genpkey -algorithm ed25519 -out jws_private.pem
openssl pkey -in jws_private.pem -pubout -out jws_public.pem
jws_public=$(<jws_public.pem)
jws_private=$(<jws_private.pem)
echo "jwsPublicKey=\"$jws_public\"" > ./mediaRouter/.dev.vars
echo "jwsPrivateKey=\"$jws_private\"" >> ./mediaRouter/.dev.vars

echo $jws_public | wrangler secret put jwsPublicKey --name mediarouter
echo $jws_private | wrangler secret put jwsPrivateKey --name mediarouter
