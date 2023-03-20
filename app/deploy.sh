#!/bin/bash

npm run build
ts-node --esm --project ./tsconfig.deploy.json buildHeaders.ts
source env.sh
wrangler pages publish ./dist --project-name app --branch main
