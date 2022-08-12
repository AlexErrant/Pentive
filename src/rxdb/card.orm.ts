import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { Card } from "../domain/card"
import { CardId } from "../domain/ids"
import { CardDocType } from "./card.schema"

export function cardToDocType(card: Card): CardDocType {
  const { id, title, created, modified, ...shrunken } = card // https://stackoverflow.com/a/66899790
  return {
    id,
    title: title ?? undefined,
    created: created.toISOString(),
    modified: modified.toISOString(),
    data: shrunken,
  }
}

interface CardDocMethods extends KeyFunctionMap {}

export type CardDocument = RxDocument<CardDocType, CardDocMethods>

// we declare one static ORM-method for the collection
interface CardCollectionMethods extends KeyFunctionMap {
  getCard: (cardId: CardId) => Promise<Card | null>
}

// and then merge all our types
export type CardCollection = RxCollection<
  CardDocType,
  CardDocMethods,
  CardCollectionMethods
>

export const cardDocMethods: CardDocMethods = {}

export const cardCollectionMethods: CardCollectionMethods = {
  getCard: async function (this: CardCollection, cardId: CardId) {
    const card = await this.findOne(cardId).exec()
    if (card == null) {
      return null
    } else {
      const r = {
        id: card.id as CardId,
        title: card.title,
        created: new Date(card.created),
        modified: new Date(card.modified),
        ...(card.data as object),
      }
      // @ts-expect-error Unsure why `type` is in `data` - it's not there when inserted. RxDB or PouchDB or something adds it. Removing to make roundtrip testing easier.
      delete r.type
      if (r.title === undefined) {
        delete r.title
      }
      return r as Card
    }
    // return card?.data // todo This is not quite correct! Returning dates are *sometimes* strings.
    // I think the first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
    // After an upsert, the return is a Date Object because RxDB caches the upserted object.
    // Leave this note here until you figure out how due dates are handled in Cards' Cards. Will we have to map over them to deserialize?
  },
}
