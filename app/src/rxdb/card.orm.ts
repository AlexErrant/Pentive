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
  getCards: () => Promise<Card[]>
}

// and then merge all our types
export type CardCollection = RxCollection<
  CardDocType,
  CardDocMethods,
  CardCollectionMethods
>

export const cardDocMethods: CardDocMethods = {}

function entityToDomain(
  card: RxDocument<
    {
      id: string
      created: string
      modified: string
      data: unknown
      title?: string | undefined
    },
    CardDocMethods
  >
): Card {
  const r = {
    id: card.id as CardId,
    title: card.title,
    created: new Date(card.created),
    modified: new Date(card.modified),
    ...(card.data as object),
  }
  if (r.title === undefined) {
    delete r.title
  }
  return r as Card
  // Returning dates are *sometimes* strings.
  // The first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
  // After an upsert, the return is a Date Object because RxDB caches the upserted object... I think.
}

export const cardCollectionMethods: CardCollectionMethods = {
  getCard: async function (this: CardCollection, cardId: CardId) {
    const card = await this.findOne(cardId).exec()
    return card == null ? null : entityToDomain(card)
  },
  getCards: async function (this: CardCollection) {
    const allCards = await this.find().exec()
    return allCards.map(entityToDomain)
  },
}
