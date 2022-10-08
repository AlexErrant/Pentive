import { Buffer } from "buffer"
import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js"
import { throwExp } from "../../domain/utility"
import initSqlJs, { Database } from "sql.js"

export async function importAnki(
  event: Event & {
    currentTarget: HTMLInputElement
    target: Element
  }
): Promise<void> {
  const ankiExport =
    (event.target as HTMLInputElement).files?.item(0) ??
    throwExp("Impossible - there should be a file selected")
  const db = await getDb(ankiExport)
  const cols = db.prepare("select * from col")
  while (cols.step()) {
    const row = cols.getAsObject()
    console.log(row)
  }
  db.close()
}

async function getDb(ankiExport: File): Promise<Database> {
  const sql = await getSql()
  const sqliteBlob = await getSqliteBlob(ankiExport)
  const db = new sql.Database(
    Buffer.from(new Uint8Array(await sqliteBlob.arrayBuffer()))
  )
  return db
}

async function getSqliteBlob(ankiExport: File): Promise<Blob> {
  const ankiEntries = await new ZipReader(
    new BlobReader(ankiExport)
  ).getEntries()
  const sqlite =
    ankiEntries.find((e) => e.filename === "collection.anki2") ??
    throwExp("`collection.anki2` not found!")
  const sqliteBlob =
    (await sqlite.getData?.(new BlobWriter())) ??
    throwExp("todo - I don't understand why `getData` is nullable")
  return sqliteBlob
}

async function getSql(): Promise<initSqlJs.SqlJsStatic> {
  return await initSqlJs({
    // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  })
}
