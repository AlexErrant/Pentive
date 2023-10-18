#!/bin/sh -e

# https://github.com/pahen/madge/issues/271#issuecomment-1484764471

TS_CONFIG=$(node -e "console.log(JSON.stringify(require('get-tsconfig').getTsconfig().config, null, 2))")

JSON_STRING=$(
	cat <<EOF
{
  "_note_": "This file is autogenerated",
  "tsConfig": $TS_CONFIG,
  "fileExtensions": ["js", "ts", "tsx"]
}
EOF
)

echo "$JSON_STRING" >.madgerc
npx madge ./src -c --warning