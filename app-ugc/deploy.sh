#!/bin/bash

npm run build
ts-node --esm buildHeaders.ts
source env.sh
wrangler pages publish ./dist
