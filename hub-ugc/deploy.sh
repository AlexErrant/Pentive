#!/bin/bash

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

[[ -f "env.sh" ]] && source env.sh
npx tsx --tsconfig ./tsconfig.deploy.json buildHeaders.ts
npx wrangler pages deploy ./dist --project-name hub-ugc --branch main
