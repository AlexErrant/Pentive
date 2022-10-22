/* eslint-disable */

declare global {
  interface Window {
    deleteHero: Function
  }
}

import "./style.css"
import { addRxPlugin, createRxDatabase } from "rxdb"
import { addPouchPlugin, getRxStoragePouch } from "rxdb/plugins/pouchdb"
import { filter } from "rxjs/operators"

import * as pouchdbAdapter from "pouchdb-adapter-idb"
addPouchPlugin(pouchdbAdapter)
import {
  RxDBReplicationGraphQLPlugin,
  pullQueryBuilderFromRxSchema,
  pushQueryBuilderFromRxSchema,
} from "rxdb/plugins/replication-graphql"
addRxPlugin(RxDBReplicationGraphQLPlugin)

// TODO import these only in non-production build

// already loaded in rxdb.ts
// import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode"
// addRxPlugin(RxDBDevModePlugin)
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv"

import { RxDBUpdatePlugin } from "rxdb/plugins/update"
addRxPlugin(RxDBUpdatePlugin)

import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder"
addRxPlugin(RxDBQueryBuilderPlugin)

import {
  GRAPHQL_PORT,
  GRAPHQL_PATH,
  heroSchema,
  mutableGraphQLGenerationInput,
  JWT_BEARER_TOKEN,
} from "rxql/shared"

const insertButton = document.querySelector(
  "#insert-button"
) as HTMLButtonElement
const heroesList = document.querySelector("#heroes-list")!
const leaderIcon = document.querySelector("#leader-icon") as HTMLDivElement
const storageField = document.querySelector("#storage-key")!
const databaseNameField = document.querySelector("#database-name")!

console.log("hostname: " + window.location.hostname)

const syncUrls = {
  http:
    "https://" + window.location.hostname + ":" + GRAPHQL_PORT + GRAPHQL_PATH,
}

const batchSize = 50

const pullQueryBuilder = pullQueryBuilderFromRxSchema(
  "hero",
  mutableGraphQLGenerationInput.hero
)
const pushQueryBuilder = pushQueryBuilderFromRxSchema(
  "hero",
  mutableGraphQLGenerationInput.hero
)

/**
 * In the e2e-test we get the database-name from the get-parameter
 * In normal mode, the database name is 'heroesdb'
 */
function getDatabaseName() {
  const url_string = window.location.href
  const url = new URL(url_string)
  const dbNameFromUrl = url.searchParams.get("database")

  let ret = "heroesdb"
  if (dbNameFromUrl) {
    console.log("databaseName from url: " + dbNameFromUrl)
    ret += dbNameFromUrl
  }
  return ret
}

function doSync() {
  const url_string = window.location.href
  const url = new URL(url_string)
  const shouldSync = url.searchParams.get("sync")
  if (shouldSync && shouldSync.toLowerCase() === "false") {
    return false
  } else {
    return true
  }
}

function getStorageKey() {
  const url_string = window.location.href
  const url = new URL(url_string)
  let storageKey = url.searchParams.get("storage")
  if (!storageKey) {
    storageKey = "dexie"
  }
  return storageKey
}

async function run() {
  storageField.innerHTML = getStorageKey()
  databaseNameField.innerHTML = getDatabaseName()
  heroesList.innerHTML = "Create database.."
  const db = await createRxDatabase({
    name: getDatabaseName(),
    storage: wrappedValidateAjvStorage({
      storage: getRxStoragePouch("idb"),
    }),
    multiInstance: getStorageKey() !== "memory",
  })

  // display crown when tab is leader
  db.waitForLeadership().then(function () {
    document.title = "♛ " + document.title
    leaderIcon.style.display = "block"
  })

  heroesList.innerHTML = "Create collection.."
  await db.addCollections({
    hero: {
      schema: heroSchema,
    },
  })

  db.hero.preSave(function (docData) {
    docData.updatedAt = new Date().getTime()
  }, true)

  // set up replication
  if (doSync()) {
    heroesList.innerHTML = "Start replication.."
    const replicationState = db.hero.syncGraphQL({
      url: syncUrls,
      headers: {
        /* optional, set an auth header */
        Authorization: "Bearer " + JWT_BEARER_TOKEN,
      },
      push: {
        batchSize,
        queryBuilder: pushQueryBuilder,
      },
      pull: {
        batchSize,
        queryBuilder: pullQueryBuilder,
      },
      deletedField: "deleted",
    })

    // show replication-errors in logs
    heroesList.innerHTML = "Subscribe to errors.."
    replicationState.error$.subscribe((err) => {
      console.error("replication error:")
      console.dir(err)
    })
  }

  // log all collection events for debugging
  db.hero.$.pipe(filter((ev) => !ev.isLocal)).subscribe((ev) => {
    console.log("collection.$ emitted:")
    console.dir(ev)
  })

  /**
   * We await the inital replication
   * so that the client never shows outdated data.
   * You should not do this if you want to have an
   * offline-first client, because the inital sync
   * will not run through without a connection to the
   * server.
   */
  heroesList.innerHTML = "Await initial replication.."
  // TODO this did full block the laoding because awaitInitialReplication() never resolves if other tab is leader
  // await replicationState.awaitInitialReplication();

  // subscribe to heroes list and render the list on change
  heroesList.innerHTML = "Subscribe to query.."
  db.hero
    .find()
    .sort({
      name: "asc",
    })
    .$.subscribe(function (heroes) {
      console.log("emitted heroes:")
      console.dir(heroes.map((d) => d.toJSON()))
      let html = ""
      heroes.forEach(function (hero) {
        html += `
                    <li class="hero-item">
                        <div class="color-box" style="background:${hero.color}"></div>
                        <div class="name">${hero.name} (updatedAt: ${hero.updatedAt})</div>
                        <div class="delete-icon" onclick="window.deleteHero('${hero.primary}')">DELETE</div>
                    </li>
                `
      })
      heroesList.innerHTML = html
    })

  // set up click handlers
  window.deleteHero = async (id: string) => {
    console.log("delete doc " + id)
    const doc = await db.hero.findOne(id).exec()
    if (doc) {
      console.log("got doc, remove it")
      try {
        await doc.remove()
      } catch (err) {
        console.error("could not remove doc")
        console.dir(err)
      }
    }
  }
  insertButton.onclick = async function () {
    let inputName = document.querySelector(
      'input[name="name"]'
    ) as HTMLInputElement
    let inputColor = document.querySelector(
      'input[name="color"]'
    ) as HTMLInputElement
    const name = inputName.value
    const color = inputColor.value
    const obj = {
      id: name,
      name: name,
      color: color,
      updatedAt: new Date().getTime(),
    }
    console.log("inserting hero:")
    console.dir(obj)

    await db.hero.insert(obj)
    inputName.value = ""
    inputColor.value = ""
  }
}
run().catch((err) => {
  console.log("run() threw an error:")
  console.error(err)
})
