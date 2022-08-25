import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { HeroDocType } from "./hero.schema"

interface HeroDocMethods extends KeyFunctionMap {
  scream: (v: string) => string
}

export type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>

// we declare one static ORM-method for the collection
interface HeroCollectionMethods extends KeyFunctionMap {
  countAllDocuments: () => Promise<number>
  upsertHero: (i: number) => Promise<void>
  getAge: () => Promise<number>
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
  upsertHero: async function upsert(this: HeroCollection, i: number) {
    const hero: HeroDocument = await this.upsert({
      passportId: "myId",
      firstName: "piotr",
      lastName: "potter",
      age: i,
    })

    // access a property
    console.log(hero.firstName)

    // use a orm method
    hero.scream("AAH!")

    // use a static orm method from the collection
    const amount: number = await this.countAllDocuments()
    console.log(amount)
  },
  getAge: async function getAge(this: HeroCollection) {
    const hero = await this.findOne("myId").exec()
    return hero?.age ?? 3
  },
}
