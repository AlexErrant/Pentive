#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

# requires installing https://github.com/FiloSottile/mkcert
mkdir app/.cert
mkcert -key-file app/.cert/key.pem     -cert-file app/.cert/cert.pem     app.pentive.local
mkdir app-ugc/.cert
mkcert -key-file app-ugc/.cert/key.pem -cert-file app-ugc/.cert/cert.pem app-user-generated-content.pentive.local
mkdir hub/.cert
mkcert -key-file hub/.cert/key.pem     -cert-file hub/.cert/cert.pem     pentive.local
mkdir hub-ugc/.cert
mkcert -key-file hub-ugc/.cert/key.pem -cert-file hub-ugc/.cert/cert.pem hub-user-generated-content.pentive.local
mkdir lrpc/.cert
mkcert -key-file lrpc/.cert/key.pem    -cert-file lrpc/.cert/cert.pem    lrpc.pentive.local
mkdir peer/.cert
mkcert -key-file peer/.cert/key.pem    -cert-file peer/.cert/cert.pem    peer.pentive.local

mkcert -key-file key.pem               -cert-file cert.pem               user-generated-content-pentive.local cwa.pentive.local
mv key.pem  ~/.wrangler/local-cert/key.pem
mv cert.pem ~/.wrangler/local-cert/cert.pem
