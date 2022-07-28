import {
  createRxDatabase,
  RxDatabase,
  RxCollection,
  RxDocument,
  KeyFunctionMap,
} from "rxdb"
import { HeroDocType, heroSchema } from "./schemas/hero"
import * as pouchdbAdapterIdb from "pouchdb-adapter-idb"
import { getRxStoragePouch, addPouchPlugin } from "rxdb/plugins/pouchdb"
// @ts-expect-error pouchdb is untyped
import * as pouchdbAdapterHttp from "pouchdb-adapter-http"
addPouchPlugin(pouchdbAdapterHttp)
addPouchPlugin(pouchdbAdapterIdb)

interface HeroDocMethods extends KeyFunctionMap {
  scream: (v: string) => string
}

type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>

// we declare one static ORM-method for the collection
interface HeroCollectionMethods extends KeyFunctionMap {
  countAllDocuments: () => Promise<number>
}

// and then merge all our types
type HeroCollection = RxCollection<
  HeroDocType,
  HeroDocMethods,
  HeroCollectionMethods
>

interface MyDatabaseCollections {
  heroes: HeroCollection
}

type MyDatabase = RxDatabase<MyDatabaseCollections>

export async function demoFunction(): Promise<void> {
  /**
   * create database and collections
   */
  const myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
    name: "mydb",
    storage: getRxStoragePouch("idb"),
  })

  const heroDocMethods: HeroDocMethods = {
    scream: function (this: HeroDocument, what: string) {
      return this.firstName + " screams: " + what.toUpperCase()
    },
  }

  const heroCollectionMethods: HeroCollectionMethods = {
    countAllDocuments: async function (this: HeroCollection) {
      const allDocs = await this.find().exec()
      return allDocs.length
    },
  }

  await myDatabase.addCollections({
    heroes: {
      schema: heroSchema,
      methods: heroDocMethods,
      statics: heroCollectionMethods,
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

  /**
   * use the database
   */

  // insert a document
  const hero: HeroDocument = await myDatabase.heroes.insert({
    passportId: "myId",
    firstName: "piotr",
    lastName: "potter",
    age: 5,
  })

  // access a property
  console.log(hero.firstName)

  // use a orm method
  hero.scream("AAH!")

  // use a static orm method from the collection
  const amount: number = await myDatabase.heroes.countAllDocuments()
  console.log(amount)

  /**
   * clean up
   */
  await myDatabase.destroy()
}
