// lowTODO optimize https://sql.js.org/#/?id=use-as-web-worker https://gildas-lormeau.github.io/zip.js/api/interfaces/WorkerConfiguration.html#useWebWorkers
// prepared statements https://blog.logrocket.com/detailed-look-basic-sqljs-features/
// pagination https://stackoverflow.com/q/14468586

import { Buffer } from "buffer"
import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js"
import { throwExp } from "../../domain/utility"
import initSqlJs, { Database } from "sql.js"
import { checkCol } from "./typeChecker"
import { parseTemplates } from "./parser"

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
  const db = await getDb(ankiExport)
  try {
    const cols = db.prepare("select * from col")
    while (cols.step()) {
      const row = cols.getAsObject()
      const col = checkCol(row)
      const templates = parseTemplates(col.models)
      console.log(templates)
    }
  } finally {
    db.close()
  }
}

async function getDb(ankiExport: File): Promise<Database> {
  const [sql, sqliteBuffer] = await Promise.all([
    initSqlJs({
      // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    }),
    getSqliteBuffer(ankiExport),
  ])
  return new sql.Database(sqliteBuffer)
}

async function getSqliteBuffer(ankiExport: File): Promise<Buffer> {
  const ankiEntries = await new ZipReader(
    new BlobReader(ankiExport)
  ).getEntries()
  const sqlite =
    ankiEntries.find((e) => e.filename === "collection.anki2") ??
    throwExp("`collection.anki2` not found!")
  const blob =
    (await sqlite.getData?.(new BlobWriter())) ??
    throwExp(
      "Impossible since we're using `getEntries` https://github.com/gildas-lormeau/zip.js/issues/371"
    )
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(new Uint8Array(arrayBuffer))
}
