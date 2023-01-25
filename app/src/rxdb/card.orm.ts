import _ from "lodash"
import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { Card } from "../domain/card"
import { CardId, NoteId } from "../domain/ids"
import { CardDocType } from "./card.schema"
import { getDb } from "./rxdb"

function cardToDocType(card: Card): CardDocType {
  const { id, noteId, created, modified, due, ...shrunken } = card // https://stackoverflow.com/a/66899790
  return {
    id,
    noteId,
    created: created.toISOString(),
    modified: modified.toISOString(),
    due: due.toISOString(),
    data: shrunken,
  }
}

interface CardDocMethods extends KeyFunctionMap {}

export type CardDocument = RxDocument<CardDocType, CardDocMethods>

// and then merge all our types
export type CardCollection = RxCollection<CardDocType, CardDocMethods>

export const cardDocMethods: CardDocMethods = {}

function entityToDomain(card: CardDocument): Card {
  const r = {
    id: card.id as CardId,
    noteId: card.noteId as NoteId,
    created: new Date(card.created),
    modified: new Date(card.modified),
    due: new Date(card.due),
    ...(card.data as object),
  }
  // @ts-expect-error Unsure why `type` is in `data` - it's not there when inserted. RxDB or PouchDB or something adds it. Removing to make roundtrip testing easier.
  delete r.type
  return r as Card
  // Returning dates are *sometimes* strings.
  // The first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
  // After an upsert, the return is a Date Object because RxDB caches the upserted object... I think.
}

export const cardCollectionMethods = {
  upsertCard: async function (card: Card) {
    const db = await getDb()
    await db.cards.upsert(cardToDocType(card))
  },
  bulkUpsertCards: async function (cards: Card[]) {
    const db = await getDb()
    const batches = _.chunk(cards.map(cardToDocType), 1000)
    for (let i = 0; i < batches.length; i++) {
      console.log("card batch", i)
      await db.cards.bulkUpsert(batches[i])
    }
  },
  getCard: async function (cardId: CardId) {
    const db = await getDb()
    const card = await db.cards.findOne(cardId).exec()
    return card == null ? null : entityToDomain(card)
  },
  getCards: async function (exclusiveStartId?: CardId, limit?: number) {
    const db = await getDb()
    const selector =
      exclusiveStartId === undefined ? {} : { id: { $gt: exclusiveStartId } }
    const allCards = await db.cards.find({ selector, limit }).exec()
    return allCards.map(entityToDomain)
  },
}
