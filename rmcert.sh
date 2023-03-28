#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

rm -rf app/.cert
rm -rf app-ugc/.cert
rm -rf hub/.cert
rm -rf hub-ugc/.cert
rm -rf lrpc/.cert
rm -rf peer/.cert
rm -f ~/.wrangler/local-cert/key.pem
rm -f ~/.wrangler/local-cert/cert.pem
