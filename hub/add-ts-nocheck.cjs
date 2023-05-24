/*
Fix for "tsc --noEmit" issue:
https://github.com/solidjs/solid-start/issues/255
*/

const fs = require("fs")

const ADDED_STR = "// @ts-nocheck\n\n"
const FILES = [
  "node_modules/solid-start/data/createRouteAction.tsx",
  "node_modules/solid-start/data/createRouteData.tsx",
  "node_modules/solid-start/data/Form.tsx",
  "node_modules/solid-start/entry-client/mount.tsx",
  "node_modules/solid-start/entry-client/StartClient.tsx",
  "node_modules/solid-start/entry-server/render.ts",
  "node_modules/solid-start/entry-server/StartServer.tsx",
  "node_modules/solid-start/error-boundary/ErrorBoundary.tsx",
  "node_modules/solid-start/islands/index.tsx",
  "node_modules/solid-start/islands/router.ts",
  "node_modules/solid-start/root/InlineStyles.tsx",
  "node_modules/solid-start/root/Links.tsx",
  "node_modules/solid-start/root/Scripts.tsx",
  "node_modules/solid-start/router.tsx",
  "node_modules/solid-start/server/components/HttpHeader.tsx",
  "node_modules/solid-start/server/components/HttpStatusCode.tsx",
  "node_modules/solid-start/server/middleware.ts",
  "node_modules/solid-start/server/responses.ts",
  "node_modules/solid-start/server/server-functions/server.ts",
  "node_modules/solid-start/types.ts",
  "node_modules/solid-start/vite/plugin.d.ts",
  "node_modules/solid-start/api/internalFetch.ts",
]

Promise.allSettled(FILES.map(addTsNoCheck)).then((results) => {
  let hasErrors = false

  for (const result of results) {
    if (result.status === "rejected") {
      hasErrors = true
      console.error(result.reason)
    }
  }

  if (hasErrors) {
    process.exit(1)
  }
})

async function addTsNoCheck(file) {
  const content = fs.readFileSync(file).toString()

  if (content.includes(ADDED_STR)) {
    console.log(JSON.stringify(ADDED_STR), "is already in", file)
  } else {
    fs.writeFileSync(file, ADDED_STR + content)
    console.log(JSON.stringify(ADDED_STR), "added into", file)
  }
}

const ADDED_STR_TYPE =
  'import type * as StartServerTypes from "./StartServer";\n\n'
const FILES_TYPE = ["node_modules/solid-start/entry-server/render.ts"]

Promise.allSettled(FILES_TYPE.map(addTypeImport)).then((results) => {
  let hasErrors = false

  for (const result of results) {
    if (result.status === "rejected") {
      hasErrors = true
      console.error(result.reason)
    }
  }

  if (hasErrors) {
    process.exit(1)
  }
})

async function addTypeImport(file) {
  const content = fs.readFileSync(file).toString()

  if (content.includes(ADDED_STR_TYPE)) {
    console.log(JSON.stringify(ADDED_STR_TYPE), "is already in", file)
  } else {
    fs.writeFileSync(file, ADDED_STR_TYPE + content)
    console.log(JSON.stringify(ADDED_STR_TYPE), "added into", file)
  }
}
