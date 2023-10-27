cp ../node_modules/.pnpm/node_modules/sql.js/dist/sql-wasm.wasm ./src/assets/sql-wasm.wasm
rm -rf ./public/assets/
mkdir -p ./public/assets/
solidVersion=$(jq -r '.version' ./node_modules/solid-js/package.json)
cp ./node_modules/solid-js/dist/solid.js "./public/assets/solid.$solidVersion.js"
cp ./node_modules/solid-js/web/dist/web.js "./public/assets/solidWeb.$solidVersion.js"
routerVersion=$(jq -r '.version' ./node_modules/@solidjs/router/package.json)
cp ./node_modules/@solidjs/router/dist/index.js "./public/assets/solidRouter.$routerVersion.js"
