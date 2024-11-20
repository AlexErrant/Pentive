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
mkdir cwa/.cert
mkcert -key-file cwa/.cert/key.pem     -cert-file cwa/.cert/cert.pem     cwa.pentive.localhost
mkdir api-ugc/.cert
mkcert -key-file api-ugc/.cert/key.pem -cert-file api-ugc/.cert/cert.pem user-generated-content-pentive.localhost
