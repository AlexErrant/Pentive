import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { HeroDocType } from "./hero.schema"
import { getDb } from "./rxdb"

interface HeroDocMethods extends KeyFunctionMap {
  scream: (v: string) => string
}

export type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>

// and then merge all our types
export type HeroCollection = RxCollection<HeroDocType, HeroDocMethods>

export const heroDocMethods: HeroDocMethods = {
  scream: function (this: HeroDocument, what: string) {
    return this.firstName + " screams: " + what.toUpperCase()
  },
}

export const heroCollectionMethods = {
  countAllDocuments: async function () {
    const db = await getDb()
    const allDocs = await db.heroes.find().exec()
    return allDocs.length
  },
  upsertHero: async function upsert(i: number) {
    const db = await getDb()
    const hero: HeroDocument = await db.heroes.upsert({
      passportId: "myId",
      firstName: "piotr",
      lastName: "potter",
      age: i,
    })

    // access a property
    console.log(hero.firstName)

    // use a orm method
    hero.scream("AAH!")

    const amount: number = await this.countAllDocuments()
    console.log(amount)
  },
  getAge: async function getAge() {
    const db = await getDb()
    const hero = await db.heroes.findOne("myId").exec()
    return hero?.age ?? 3
  },
}
