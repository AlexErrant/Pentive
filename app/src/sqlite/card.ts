import { CardId, DeckId, NoteId } from "../domain/ids"
import { Card, State, NoteCard } from "../domain/card"
import { getKysely } from "./crsqlite"
import { DB, Card as CardEntity } from "./database"
import { InsertObject, Kysely } from "kysely"
import _ from "lodash"
import { assertNever, stringifySet, throwExp, undefinedMap } from "shared"
import { entityToDomain as templateEntityToDomain } from "./template"
import { entityToDomain as noteEntityToDomain } from "./note"

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
    updated,
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
    updated: updated.getTime(),
    due: due.getTime(),
    ord,
    deckIds: stringifySet(deckIds),
    cardSettingId: cardSettingId ?? null,
    state: undefinedMap(state, serializeState) ?? null,
  }
}

function entityToDomain(card: CardEntity): Card {
  const r = {
    id: card.id as CardId,
    noteId: card.noteId as NoteId,
    created: new Date(card.created),
    updated: new Date(card.updated),
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
  bulkUpsertCards: async function (cards: Card[], db?: Kysely<DB>) {
    db ??= await getKysely()
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
  getCards: async function (offset: number, limit: number) {
    const db = await getKysely()
    const entities = await db
      .selectFrom("note")
      .innerJoin("template", "template.id", "note.templateId")
      .innerJoin("card", "card.noteId", "note.id")
      .select([
        "card.cardSettingId as card_cardSettingId",
        "card.created as card_created",
        "card.deckIds as card_deckIds",
        "card.due as card_due",
        "card.id as card_id",
        "card.updated as card_updated",
        "card.noteId as card_noteId",
        "card.ord as card_ord",
        "card.state as card_state",

        "note.ankiNoteId as note_ankiNoteId",
        "note.created as note_created",
        "note.fieldValues as note_fieldValues",
        "note.id as note_id",
        "note.updated as note_updated",
        "note.tags as note_tags",
        "note.templateId as note_templateId",

        "template.ankiId as template_ankiId",
        "template.created as template_created",
        "template.css as template_css",
        "template.fields as template_fields",
        "template.id as template_id",
        "template.updated as template_updated",
        "template.name as template_name",
        "template.templateType as template_templateType",
      ])
      .offset(offset)
      .limit(limit)
      .execute()
    const count = await db
      .selectFrom("note")
      .select(db.fn.count<number>("id").as("c"))
      .executeTakeFirstOrThrow()
    return {
      count: count.c,
      noteCards: entities.map((tnc) => {
        const note = noteEntityToDomain(
          {
            ankiNoteId: tnc.note_ankiNoteId,
            created: tnc.note_created,
            fieldValues: tnc.note_fieldValues,
            id: tnc.note_id,
            updated: tnc.note_updated,
            tags: tnc.note_tags,
            templateId: tnc.note_templateId,
          },
          []
        )
        const template = templateEntityToDomain(
          {
            ankiId: tnc.template_ankiId,
            created: tnc.template_created,
            css: tnc.template_css,
            fields: tnc.template_fields,
            id: tnc.template_id,
            updated: tnc.template_updated,
            name: tnc.template_name,
            templateType: tnc.template_templateType,
          },
          []
        )
        const card = entityToDomain({
          cardSettingId: tnc.card_cardSettingId,
          created: tnc.card_created,
          deckIds: tnc.card_deckIds,
          due: tnc.card_due,
          id: tnc.card_id,
          updated: tnc.card_updated,
          noteId: tnc.card_noteId,
          ord: tnc.card_ord,
          state: tnc.card_state,
        })
        const r: NoteCard = { note, template, card }
        return r
      }),
    }
  },
}
