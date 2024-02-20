#!/bin/bash

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

npm run build
npx ts-node --esm --project ./tsconfig.deploy.json buildHeaders.ts
source env.sh
npx wrangler pages deploy ./dist --project-name hub-ugc --branch main
