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

# if `~/.wrangler/` exists, delete `key.pem` and `cert.pem` from it, otherwise delete `key.pem` and `cert.pem` from `XDG_CONFIG_HOME` (defaulting to `$HOME/.config`)
# ref https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/global-wrangler-config-path.ts#L15
# Sordid story here https://github.com/cloudflare/workers-sdk/issues/2118#issuecomment-1486184829
[ -d "${HOME}/.wrangler/" ] && rm -f $HOME/.wrangler/local-cert/key.pem  || rm -f "${XDG_CONFIG_HOME:-$HOME/.config}/.wrangler/local-cert/key.pem"
[ -d "${HOME}/.wrangler/" ] && rm -f $HOME/.wrangler/local-cert/cert.pem || rm -f "${XDG_CONFIG_HOME:-$HOME/.config}/.wrangler/local-cert/cert.pem"