import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { Card } from "../../src/domain/card"
import { CardId } from "../../src/domain/ids"
import { CardDocType } from "./card.schema"
import { getDb } from "./rxdb"

function cardToDocType(card: Card): CardDocType {
  const {
    id,
    title,
    created,
    modified,
    push,
    pushId,
    pushTemplateId,
    ...shrunken
  } = card // https://stackoverflow.com/a/66899790
  return {
    id,
    title: title ?? undefined,
    created: created.toISOString(),
    modified: modified.toISOString(),
    push: push === true ? 1 : 0,
    pushId,
    pushTemplateId,
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
    title: card.title,
    created: new Date(card.created),
    modified: new Date(card.modified),
    push: card.push === 1 ? true : undefined,
    pushId: card.pushId,
    pushTemplateId: card.pushTemplateId,
    ...(card.data as object),
  }
  if (r.title === undefined) {
    delete r.title
  }
  if (r.push === undefined) {
    delete r.push
  }
  if (r.pushId === undefined) {
    delete r.pushId
  }
  if (r.pushTemplateId === undefined) {
    delete r.pushTemplateId
  }
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
  getCard: async function (cardId: CardId) {
    const db = await getDb()
    const card = await db.cards.findOne(cardId).exec()
    return card == null ? null : entityToDomain(card)
  },
  getCards: async function (this: CardCollection) {
    const db = await getDb()
    const allCards = await db.cards.find().exec()
    return allCards.map(entityToDomain)
  },
}
