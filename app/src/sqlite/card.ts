import { CardId, DeckId, NoteId } from "../domain/ids"
import { Card, State } from "../domain/card"
import { getKysely } from "./crsqlite"
import { DB, Card as CardEntity } from "./database"
import { InsertObject } from "kysely"
import _ from "lodash"
import { assertNever, stringifySet, throwExp, undefinedMap } from "shared"

function serializeState(s: State): number {
  switch (s) {
    case "normal":
      return 0
    case "scheduler buried":
      return 1
    case "user buried":
      return 2
    case "suspended":
      return 3
    default:
      return assertNever(s)
  }
}

function deserializeState(s: number | null): State | undefined {
  switch (s) {
    case null:
      return undefined
    case 0:
      return "normal"
    case 1:
      return "scheduler buried"
    case 2:
      return "user buried"
    case 3:
      return "suspended"
    default:
      return throwExp(`Expected null, 0, 1, 2, or 3, but got ${s}`)
  }
}

function cardToDocType(card: Card): InsertObject<DB, "card"> {
  const {
    id,
    noteId,
    created,
    modified,
    due,
    ord,
    deckIds,
    cardSettingId,
    state,
  } = card
  return {
    id,
    noteId,
    created: created.getTime(),
    modified: modified.getTime(),
    due: due.getTime(),
    ord,
    deckIds: stringifySet(deckIds),
    cardSettingId: cardSettingId ?? null,
    state: undefinedMap(state, serializeState) ?? null,
  }
}

export function entityToDomain(card: CardEntity): Card {
  const r = {
    id: card.id as CardId,
    noteId: card.noteId as NoteId,
    created: new Date(card.created),
    modified: new Date(card.modified),
    due: new Date(card.due),
    ord: card.ord,
    deckIds: new Set(JSON.parse(card.deckIds) as DeckId[]),
    state: deserializeState(card.state),
    cardSettingId: card.cardSettingId ?? undefined,
  }
  if (r.state === undefined) {
    delete r.state
  }
  if (r.cardSettingId === undefined) {
    delete r.cardSettingId
  }
  return r
}

export const cardCollectionMethods = {
  upsertCard: async function (card: Card) {
    const db = await getKysely()
    await db.insertInto("card").values(cardToDocType(card)).execute()
  },
  bulkUpsertCards: async function (cards: Card[]) {
    const db = await getKysely()
    const batches = _.chunk(cards.map(cardToDocType), 1000)
    for (let i = 0; i < batches.length; i++) {
      console.log("card batch", i)
      await db.insertInto("card").values(batches[i]).execute()
    }
  },
  getCard: async function (cardId: CardId) {
    const db = await getKysely()
    const card = await db
      .selectFrom("card")
      .selectAll()
      .where("id", "=", cardId)
      .executeTakeFirst()
    return card == null ? null : entityToDomain(card)
  },
  getCards: async function (exclusiveStartId?: CardId, limit?: number) {
    const db = await getKysely()
    const allCards = await db
      .selectFrom("card")
      .selectAll()
      .if(exclusiveStartId != null, (x) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        x.where("id", ">", exclusiveStartId!)
      )
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .if(limit != null, (x) => x.limit(limit!))
      .execute()
    return allCards.map(entityToDomain)
  },
}
