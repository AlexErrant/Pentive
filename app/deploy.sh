#!/bin/bash

# TODO: automate https://www.shellcheck.net/
set -euo pipefail # https://stackoverflow.com/a/2871034
# set -x

[[ -f "env.sh" ]] && source env.sh
set -a
[[ -f ".env.production" ]] && source .env.production
set +a
npx tsx --tsconfig ./tsconfig.deploy.json buildHeaders.ts
npx wrangler pages deploy ./dist --project-name app --branch main
