#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

# requires installing https://github.com/FiloSottile/mkcert
mkdir app/.cert
mkcert -key-file app/.cert/key.pem     -cert-file app/.cert/cert.pem     app.pentive.localhost
mkdir app-ugc/.cert
mkcert -key-file app-ugc/.cert/key.pem -cert-file app-ugc/.cert/cert.pem app-user-generated-content-pentive.localhost
mkdir hub/.cert
mkcert -key-file hub/.cert/key.pem     -cert-file hub/.cert/cert.pem     pentive.localhost
mkdir hub-ugc/.cert
mkcert -key-file hub-ugc/.cert/key.pem -cert-file hub-ugc/.cert/cert.pem hub-user-generated-content-pentive.localhost
mkdir lrpc/.cert
mkcert -key-file lrpc/.cert/key.pem    -cert-file lrpc/.cert/cert.pem    lrpc.pentive.localhost
mkdir peer/.cert
mkcert -key-file peer/.cert/key.pem    -cert-file peer/.cert/cert.pem    peer.pentive.localhost

mkcert -key-file key.pem               -cert-file cert.pem               user-generated-content-pentive.localhost cwa.pentive.localhost

# if `~/.wrangler/` exists, move `key.pem` and `cert.pem` to it, otherwise move `key.pem` and `cert.pem` to `XDG_CONFIG_HOME` (defaulting to `$HOME/.config`)
# ref https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/global-wrangler-config-path.ts#L15
# Sordid story here https://github.com/cloudflare/workers-sdk/issues/2118#issuecomment-1486184829
[ -d "${HOME}/.wrangler/" ] && mv key.pem   $HOME/.wrangler/local-cert/key.pem  || mv key.pem  "${XDG_CONFIG_HOME:-$HOME/.config}/.wrangler/local-cert/key.pem"
[ -d "${HOME}/.wrangler/" ] && mv cert.pem  $HOME/.wrangler/local-cert/cert.pem || mv cert.pem "${XDG_CONFIG_HOME:-$HOME/.config}/.wrangler/local-cert/cert.pem"