#!/bin/bash

# If this file gives you weird errors, it may be due to line endings. Try:
# find . -type f -name '*.sh' | xargs sed -i -e 's/\r$//'
# find . -type f -name '.env' | xargs sed -i -e 's/\r$//'

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

source ./youch/.env
source ./ivy/.env
YOUCH_URL=http://localhost:${YOUCH_HOST_PORT}

YOUCH_HOST_PORT=${YOUCH_HOST_PORT} IVY_HOST_PORT=${IVY_HOST_PORT} docker compose down
YOUCH_HOST_PORT=${YOUCH_HOST_PORT} IVY_HOST_PORT=${IVY_HOST_PORT} docker compose up --detach

printf "Connecting to Youch..."
# https://stackoverflow.com/a/57660677
# https://stackoverflow.com/a/21189440
until curl --output /dev/null --silent --head --fail "${YOUCH_URL}"; do
    printf '.'
    sleep 1
done
printf "\n...connected!\n\n"

echo "Configuring Youch..."
curl --silent --show-error --output /dev/null --user "${COUCHDB_USER}:${COUCHDB_PASSWORD}" -X PUT "${YOUCH_URL}/_users"
curl --silent --show-error --output /dev/null --user "${COUCHDB_USER}:${COUCHDB_PASSWORD}" -X PUT "${YOUCH_URL}/_node/_local/_config/couch_peruser/enable" -d '"true"'
curl --silent --show-error --output /dev/null --user "${COUCHDB_USER}:${COUCHDB_PASSWORD}" -X PUT "${YOUCH_URL}/_node/_local/_config/chttpd_auth/timeout" -d '"86400"'
curl --silent --show-error --output /dev/null --user "${COUCHDB_USER}:${COUCHDB_PASSWORD}" -X PUT "${YOUCH_URL}/_node/_local/_config/httpd/enable_cors" -d '"true"'
curl --silent --show-error --output /dev/null --user "${COUCHDB_USER}:${COUCHDB_PASSWORD}" -X PUT "${YOUCH_URL}/_node/_local/_config/cors/credentials" -d '"true"'
curl --silent --show-error --output /dev/null --user "${COUCHDB_USER}:${COUCHDB_PASSWORD}" -X PUT "${YOUCH_URL}/_node/_local/_config/cors/origins" -d '"*"' # highTODO make more restrictive
curl --silent --show-error --output /dev/null --user "${COUCHDB_USER}:${COUCHDB_PASSWORD}" -X PUT "${YOUCH_URL}/_node/_local/_config/cors/methods" -d '"GET, PUT, POST, HEAD, DELETE"'
curl --silent --show-error --output /dev/null --user "${COUCHDB_USER}:${COUCHDB_PASSWORD}" -X PUT "${YOUCH_URL}/_node/_local/_config/cors/headers" -d '"accept, authorization, content-type, origin, referer"'
echo "...configured!"
