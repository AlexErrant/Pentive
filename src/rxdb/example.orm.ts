import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { ExampleDocType } from "./example.schema"

interface ExampleDocMethods extends KeyFunctionMap {}

export type ExampleDocument = RxDocument<ExampleDocType, ExampleDocMethods>

// we declare one static ORM-method for the collection
interface ExampleCollectionMethods extends KeyFunctionMap {
  countAllDocuments: () => Promise<number>
}

// and then merge all our types
export type ExampleCollection = RxCollection<
  ExampleDocType,
  ExampleDocMethods,
  ExampleCollectionMethods
>

export const exampleDocMethods: ExampleDocMethods = {}

export const exampleCollectionMethods: ExampleCollectionMethods = {
  countAllDocuments: async function (this: ExampleCollection) {
    const allDocs = await this.find().exec()
    return allDocs.length
  },
}
