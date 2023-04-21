#!/bin/bash

npm run build
ts-node --esm --project ./tsconfig.deploy.json buildHeaders.ts
source env.sh
npx wrangler pages publish ./dist --project-name hub-ugc --branch main
