#!/bin/bash

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

npx tsx --tsconfig ./tsconfig.deploy.json buildHeaders.ts
[[ -f "env.sh" ]] && source env.sh
npx wrangler pages deploy ./dist --project-name app-ugc --branch main
