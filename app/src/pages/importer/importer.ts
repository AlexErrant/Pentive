// lowTODO optimize https://sql.js.org/#/?id=use-as-web-worker https://gildas-lormeau.github.io/zip.js/api/interfaces/WorkerConfiguration.html#useWebWorkers
// prepared statements https://blog.logrocket.com/detailed-look-basic-sqljs-features/
// pagination https://stackoverflow.com/q/14468586

import { Buffer } from "buffer"
import {
  BlobReader,
  BlobWriter,
  Entry,
  TextWriter,
  Uint8ArrayWriter,
  ZipReader,
} from "@zip.js/zip.js"
import { throwExp } from "shared"
import initSqlJs, { Database } from "sql.js"
import { checkCard, checkCol, checkMedia, checkNote } from "./typeChecker"
import { parseNote, parseCard, parseTemplates } from "./parser"
import { Card as PCard } from "../../domain/card"
import { Note as PNote } from "../../domain/note"
import { Template } from "../../domain/template"
import { ResourceId, TemplateId } from "../../domain/ids"
import { db } from "../../messenger"
import _ from "lodash"
import { Resource } from "../../domain/resource"

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
  const resourcesAndNulls = await Promise.all(
    entries.map(async (entry) => {
      const array =
        (await entry.getData?.(new Uint8ArrayWriter())) ??
        throwExp(
          "Impossible since we're using `getEntries` https://github.com/gildas-lormeau/zip.js/issues/371"
        )
      const name = nameByI[entry.filename]
      return name == null // occurs for entries that aren't media, e.g. collection.anki2
        ? null
        : {
            id: name as ResourceId,
            created: new Date(),
            data: array.buffer,
          }
    })
  )
  const resources = resourcesAndNulls.filter((r) => r != null) as Resource[]
  await db.bulkAddResources(resources)
}

async function importAnkiDb(sqlite: Entry): Promise<void> {
  const ankiDb = await getAnkiDb(sqlite)
  const templatesDict: Record<TemplateId, Template> = {}
  const notesDict: Record<number, PNote> = {}
  const cardsList: PCard[] = []
  try {
    // highTODO wrap in a transaction
    const cols = ankiDb.prepare("select * from col") // lowTODO select exact columns
    while (cols.step()) {
      const row = cols.getAsObject()
      const col = checkCol(row)
      const templates = parseTemplates(col.models)
      await db.bulkUpsertTemplate(templates)
      templates.forEach((t) => (templatesDict[t.id] = t))
      console.log(templates)
    }
    cols.free()
    const notes = ankiDb.prepare("select * from notes") // lowTODO select exact columns
    while (notes.step()) {
      const row = notes.getAsObject()
      const note = checkNote(row)
      notesDict[note.id] = parseNote(note, templatesDict)
    }
    notes.free()
    await db.bulkUpsertNotes(Object.values(notesDict))
    const cards = ankiDb.prepare("select * from cards") // lowTODO select exact columns
    while (cards.step()) {
      const row = cards.getAsObject()
      const card = checkCard(row)
      cardsList.push(parseCard(card, notesDict, templatesDict))
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
      // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
      // Grep for F00E815A-C0FD-4AEA-B83C-0BDB641D97CC
      // Service worker probably needs a reference.
      // https://stackoverflow.com/q/71571129 https://vitejs.dev/guide/features.html#webassembly https://github.com/vitejs/vite/issues/378 https://stackoverflow.com/q/69614671
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
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
