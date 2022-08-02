import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { HeroDocType } from "../schemas/hero"

interface HeroDocMethods extends KeyFunctionMap {
  scream: (v: string) => string
}

export type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>

// we declare one static ORM-method for the collection
interface HeroCollectionMethods extends KeyFunctionMap {
  countAllDocuments: () => Promise<number>
}

// and then merge all our types
export type HeroCollection = RxCollection<
  HeroDocType,
  HeroDocMethods,
  HeroCollectionMethods
>

export const heroDocMethods: HeroDocMethods = {
  scream: function (this: HeroDocument, what: string) {
    return this.firstName + " screams: " + what.toUpperCase()
  },
}

export const heroCollectionMethods: HeroCollectionMethods = {
  countAllDocuments: async function (this: HeroCollection) {
    const allDocs = await this.find().exec()
    return allDocs.length
  },
}
