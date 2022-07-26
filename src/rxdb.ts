import {
  createRxDatabase,
  RxDatabase,
  RxCollection,
  RxJsonSchema,
  RxDocument,
} from "rxdb"

type HeroDocMethods = {
  scream: (v: string) => string
}

type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>

// we declare one static ORM-method for the collection
type HeroCollectionMethods = {
  countAllDocuments: () => Promise<number>
}

// and then merge all our types
type HeroCollection = RxCollection<
  HeroDocType,
  HeroDocMethods,
  HeroCollectionMethods
>

type MyDatabaseCollections = {
  heroes: HeroCollection
}

type MyDatabase = RxDatabase<MyDatabaseCollections>
