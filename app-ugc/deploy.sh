#!/bin/bash

npm run build
npx ts-node --esm --project ./tsconfig.deploy.json buildHeaders.ts
source env.sh
npx wrangler pages publish ./dist --project-name app-ugc --branch main
