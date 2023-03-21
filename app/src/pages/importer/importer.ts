// lowTODO optimize https://sql.js.org/#/?id=use-as-web-worker https://gildas-lormeau.github.io/zip.js/api/interfaces/WorkerConfiguration.html#useWebWorkers
// prepared statements https://blog.logrocket.com/detailed-look-basic-sqljs-features/
// pagination https://stackoverflow.com/q/14468586

// lowTODO It would be nice if we could use wa-sqlite/cr-sqlite instead of sql.js
// since it would be less dependencies and less wasm binaries being cached by the service worker.
// However, until I figure out how to read from an existing sqlite file in cr-sqlite, we need both.
// See https://github.com/rhashimoto/wa-sqlite/discussions/72

import { Buffer } from "buffer"
import {
  BlobReader,
  BlobWriter,
  Entry,
  TextWriter,
  Uint8ArrayWriter,
  ZipReader,
} from "@zip.js/zip.js"
import { notEmpty, throwExp } from "shared"
import initSqlJs, { Database } from "sql.js"
import { checkCard, checkCol, checkMedia, checkNote } from "./typeChecker"
import { parseNote, parseCard, parseTemplates } from "./parser"
import { Card as PCard } from "../../domain/card"
import { Note as PNote } from "../../domain/note"
import { Template } from "../../domain/template"
import { MediaId, TemplateId } from "../../domain/ids"
import { db } from "./../../db"
import _ from "lodash"
import sqliteUrl from "../../assets/sql-wasm.wasm?url"

export async function importAnki(
  event: Event & {
    currentTarget: HTMLInputElement
    target: Element
  }
): Promise<void> {
  const ankiExport =
    // My mental static analysis says to use `currentTarget`, but it seems to randomly be null, hence `target`. I'm confused but whatever.
    (event.target as HTMLInputElement).files?.item(0) ??
    throwExp("Impossible - there should be a file selected")
  const ankiEntries = await new ZipReader(
    new BlobReader(ankiExport)
  ).getEntries()
  const sqlite =
    ankiEntries.find((e) => e.filename === "collection.anki2") ??
    throwExp("`collection.anki2` not found!")
  await importAnkiDb(sqlite)
  await importAnkiMedia(ankiEntries) // running in parallel causes ERR_OUT_OF_MEMORY
}

async function importAnkiMedia(ankiEntries: Entry[]): Promise<void> {
  const media =
    ankiEntries.find((e) => e.filename === "media") ??
    throwExp("`media` not found.")
  const mediaText =
    (await media.getData?.(new TextWriter())) ??
    throwExp(
      "Impossible since we're using `getEntries` https://github.com/gildas-lormeau/zip.js/issues/371"
    )
  const parsed = checkMedia(JSON.parse(mediaText))
  const entryChunks = _.chunk(ankiEntries, 1000)
  for (let i = 0; i < entryChunks.length; i++) {
    console.log(`media ${i}/${entryChunks.length}`)
    await addMediaBatch(entryChunks[i], parsed)
  }
  console.log("Anki media import done!")
}

async function addMediaBatch(
  entries: Entry[],
  nameByI: Record<string, string>
): Promise<void> {
  const mediaAndNulls = await Promise.all(
    entries.map(async (entry) => {
      const array =
        (await entry.getData?.(new Uint8ArrayWriter())) ??
        throwExp(
          "Impossible since we're using `getEntries` https://github.com/gildas-lormeau/zip.js/issues/371"
        )
      const name = nameByI[entry.filename]
      const now = new Date()
      return name == null // occurs for entries that aren't media, e.g. collection.anki2
        ? null
        : {
            id: name as MediaId,
            created: now,
            updated: now,
            data: array.buffer,
          }
    })
  )
  const media = mediaAndNulls.filter(notEmpty)
  await db.bulkAddMedia(media)
}

async function importAnkiDb(sqlite: Entry): Promise<void> {
  const ankiDb = await getAnkiDb(sqlite)
  const templatesMap = new Map<TemplateId, Template>()
  const notesMap = new Map<number, PNote>()
  const cardsList: PCard[] = []
  try {
    // highTODO wrap in a transaction
    const cols = ankiDb.prepare("select * from col") // lowTODO select exact columns
    while (cols.step()) {
      const row = cols.getAsObject()
      const col = checkCol(row)
      const templates = parseTemplates(col.models)
      await db.bulkUpsertTemplate(templates)
      templates.forEach((t) => templatesMap.set(t.id, t))
      console.log(templates)
    }
    cols.free()
    const notes = ankiDb.prepare("select * from notes") // lowTODO select exact columns
    while (notes.step()) {
      const row = notes.getAsObject()
      const note = checkNote(row)
      notesMap.set(note.id, parseNote(note, templatesMap))
    }
    notes.free()
    await db.bulkUpsertNotes(Array.from(notesMap.values()))
    const cards = ankiDb.prepare("select * from cards") // lowTODO select exact columns
    while (cards.step()) {
      const row = cards.getAsObject()
      const card = checkCard(row)
      cardsList.push(parseCard(card, notesMap, templatesMap))
    }
    cards.free()
    await db.bulkUpsertCards(cardsList)
  } catch (err) {
    console.error(err)
  } finally {
    ankiDb.close()
  }
  console.log("AnkiDB import done!")
}

async function getAnkiDb(sqlite: Entry): Promise<Database> {
  const [sql, sqliteBuffer] = await Promise.all([
    initSqlJs({
      locateFile: () => sqliteUrl,
    }),
    getSqliteBuffer(sqlite),
  ])
  return new sql.Database(sqliteBuffer)
}

async function getSqliteBuffer(sqlite: Entry): Promise<Buffer> {
  const blob =
    (await sqlite.getData?.(new BlobWriter())) ??
    throwExp(
      "Impossible since we're using `getEntries` https://github.com/gildas-lormeau/zip.js/issues/371"
    )
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(new Uint8Array(arrayBuffer))
}
