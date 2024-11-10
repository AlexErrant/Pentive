#!/bin/bash

# https://unix.stackexchange.com/a/336447

pnpm run turso &
sleep 2 && pnpm --filter shared-edge initIvy && npx kill-port 3011 &
wait -n
