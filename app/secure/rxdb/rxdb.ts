import { addRxPlugin, createRxDatabase, RxDatabase, RxStorage } from "rxdb"
import { HeroDocType, heroSchema } from "./hero.schema"
import { templateSchema } from "./template.schema"
import { resourceSchema } from "./resource.schema"
import { cardSchema } from "./card.schema"
import { noteSchema } from "./note.schema"
import * as pouchdbAdapterIdb from "pouchdb-adapter-idb"
import {
  getRxStoragePouch,
  addPouchPlugin,
  PouchDB,
  PouchStorageInternals,
  PouchSettings,
} from "rxdb/plugins/pouchdb"
import { RxDBLeaderElectionPlugin } from "rxdb/plugins/leader-election"
// @ts-expect-error pouchdb is untyped
import * as pouchdbAdapterHttp from "pouchdb-adapter-http"
import { RxDBReplicationCouchDBPlugin } from "rxdb/plugins/replication-couchdb"
import {
  HeroCollection,
  heroCollectionMethods,
  heroDocMethods,
  HeroDocument,
} from "./hero.orm"
import {
  TemplateCollection,
  templateCollectionMethods,
  templateDocMethods,
} from "./template.orm"
import {
  ResourceCollection,
  resourceCollectionMethods,
  resourceDocMethods,
} from "./resource.orm"
import {
  CardCollection,
  cardCollectionMethods,
  cardDocMethods,
} from "./card.orm"
import {
  NoteCollection,
  noteCollectionMethods,
  noteDocMethods,
} from "./note.orm"
import { pluginSchema } from "./plugin.schema"
import {
  PluginCollection,
  pluginCollectionMethods,
  pluginDocMethods,
} from "./plugin.orm"
import { RxDBAttachmentsPlugin } from "rxdb/plugins/attachments"
addPouchPlugin(pouchdbAdapterHttp)
addPouchPlugin(pouchdbAdapterIdb)
addRxPlugin(RxDBReplicationCouchDBPlugin)
addRxPlugin(RxDBAttachmentsPlugin)

interface MyDatabaseCollections {
  readonly heroes: HeroCollection
  readonly templates: TemplateCollection
  readonly resources: ResourceCollection
  readonly cards: CardCollection
  readonly notes: NoteCollection
  readonly plugins: PluginCollection
}

export type MyDatabase = RxDatabase<MyDatabaseCollections>

export async function createDb(): Promise<MyDatabase> {
  await loadRxDBPlugins()

  /**
   * create database and collections
   */
  let storage: RxStorage<PouchStorageInternals, PouchSettings> =
    getRxStoragePouch("idb")
  if (isDevMode) {
    // we use the schema-validation only in dev-mode
    // this validates each document if it is matching the jsonschema
    const { wrappedValidateAjvStorage } = await import(
      "rxdb/plugins/validate-ajv"
    )
    storage = wrappedValidateAjvStorage({ storage })
  }
  const myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
    name: "mydb",
    storage,
  })

  await myDatabase.addCollections({
    heroes: {
      schema: heroSchema,
      methods: heroDocMethods,
      statics: heroCollectionMethods,
    },
    templates: {
      schema: templateSchema,
      methods: templateDocMethods,
      statics: templateCollectionMethods,
    },
    resources: {
      schema: resourceSchema,
      methods: resourceDocMethods,
      statics: resourceCollectionMethods,
    },
    cards: {
      schema: cardSchema,
      methods: cardDocMethods,
      statics: cardCollectionMethods,
    },
    notes: {
      schema: noteSchema,
      methods: noteDocMethods,
      statics: noteCollectionMethods,
    },
    plugins: {
      schema: pluginSchema,
      methods: pluginDocMethods,
      statics: pluginCollectionMethods,
    },
  })

  // add a postInsert-hook
  myDatabase.heroes.postInsert(
    function myPostInsertHook(
      this: HeroCollection, // own collection is bound to the scope
      docData: HeroDocType, // documents data
      doc: HeroDocument // RxDocument
    ) {
      console.log("insert to " + this.name + "-collection: " + doc.firstName)
    },
    false // not async
  )

  return myDatabase
}

let myDatabase: Promise<MyDatabase> | null = null

export async function getDb(): Promise<MyDatabase> {
  if (myDatabase == null) {
    myDatabase = createDb()
  }
  return await myDatabase
}

export async function remove(): Promise<void> {
  const myDatabase = await getDb()
  await myDatabase.remove()
}

const isDevMode = true // TODO inject

// https://github.com/pubkey/client-side-databases/blob/a25172c012cef2985d97424a9fad917eb888b9f5/projects/rxdb-pouchdb/src/app/services/database.service.ts#L59-L108
async function loadRxDBPlugins(): Promise<void> {
  addRxPlugin(RxDBLeaderElectionPlugin)

  /**
   * to reduce the build-size,
   * we use some modules in dev-mode only
   */
  if (isDevMode) {
    await Promise.all([
      /**
       * Enable the dev mode plugin
       */
      import("rxdb/plugins/dev-mode").then((module) =>
        addRxPlugin(module.RxDBDevModePlugin)
      ),

      // enable debug to detect slow queries
      import("pouchdb-debug" + "").then((module) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        addPouchPlugin(module.default)
      ),
    ])
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    PouchDB.debug.enable("pouchdb:find")
  } else {
    // in production we do not use any validation plugin
    // to reduce the build-size
  }
}

// https://github.com/pubkey/rxdb/blob/754e489353a2611c98550b6c19c09688787a08e0/docs-src/replication-couchdb.md?plain=1#L27-L39
export async function sync(): Promise<void> {
  const myDatabase = await getDb()
  const user = "admin" // TODO
  const pass = "password"
  const syncOptions = {
    remote: `http://${user}:${pass}@localhost:5984/xheroes`, // remote database. This can be the serverURL, another RxCollection or a PouchDB-instance
    waitForLeadership: true, // (optional) [default=true] to save performance, the sync starts on leader-instance only
    direction: {
      // direction (optional) to specify sync-directions
      pull: true, // default=true
      push: true, // default=true
    },
    options: {
      // sync-options (optional) from https://pouchdb.com/api.html#replication
      live: true,
      retry: true,
    },
  }
  myDatabase.heroes.syncCouchDB(syncOptions)
  myDatabase.templates.syncCouchDB(syncOptions)
  myDatabase.resources.syncCouchDB(syncOptions)
  myDatabase.cards.syncCouchDB(syncOptions)
  myDatabase.notes.syncCouchDB(syncOptions)
  myDatabase.plugins.syncCouchDB(syncOptions)
}
