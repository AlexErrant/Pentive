import { addRxPlugin, createRxDatabase, RxDatabase } from "rxdb"
import { HeroDocType, heroSchema } from "./hero.schema"
import { cardSchema } from "./card.schema"
import { noteSchema } from "./note.schema"
import { RxDBLeaderElectionPlugin } from "rxdb/plugins/leader-election"
import { getRxStorageDexie } from "rxdb/plugins/dexie"
import {
  HeroCollection,
  heroCollectionMethods,
  heroDocMethods,
  HeroDocument,
} from "./hero.orm"
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

interface MyDatabaseCollections {
  readonly heroes: HeroCollection
  readonly cards: CardCollection
  readonly notes: NoteCollection
}

export type MyDatabase = RxDatabase<MyDatabaseCollections>

export async function createDb(): Promise<MyDatabase> {
  await loadRxDBPlugins()

  /**
   * create database and collections
   */
  const storage = getRxStorageDexie()
  let myDatabase
  if (isDevMode) {
    // we use the schema-validation only in dev-mode
    // this validates each document if it is matching the jsonschema
    const { wrappedValidateAjvStorage } = await import(
      "rxdb/plugins/validate-ajv"
    )
    myDatabase = await createRxDatabase<MyDatabaseCollections>({
      name: "mydb",
      storage: wrappedValidateAjvStorage({ storage }),
    })
  } else {
    myDatabase = await createRxDatabase<MyDatabaseCollections>({
      name: "mydb",
      storage,
    })
  }

  await myDatabase.addCollections({
    heroes: {
      schema: heroSchema,
      methods: heroDocMethods,
      statics: heroCollectionMethods,
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
    ])
  } else {
    // in production we do not use any validation plugin
    // to reduce the build-size
  }
}

export function sync(): void {
  console.log("not implemented")
}
