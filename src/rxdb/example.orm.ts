import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { Example } from "../domain/example"
import { ExampleId } from "../domain/ids"
import { ExampleDocType } from "./example.schema"

export function exampleToDocType(example: Example): ExampleDocType {
  const { id, title, created, modified, ...shrunken } = example // https://stackoverflow.com/a/66899790
  return {
    id,
    title: title ?? undefined,
    created: created.toISOString(),
    modified: modified.toISOString(),
    data: shrunken,
  }
}

interface ExampleDocMethods extends KeyFunctionMap {}

export type ExampleDocument = RxDocument<ExampleDocType, ExampleDocMethods>

// we declare one static ORM-method for the collection
interface ExampleCollectionMethods extends KeyFunctionMap {
  getExample: (exampleId: ExampleId) => Promise<Example | null>
}

// and then merge all our types
export type ExampleCollection = RxCollection<
  ExampleDocType,
  ExampleDocMethods,
  ExampleCollectionMethods
>

export const exampleDocMethods: ExampleDocMethods = {}

export const exampleCollectionMethods: ExampleCollectionMethods = {
  getExample: async function (this: ExampleCollection, exampleId: ExampleId) {
    const example = await this.findOne(exampleId).exec()
    if (example == null) {
      return null
    } else {
      const r = {
        id: example.id as ExampleId,
        title: example.title,
        created: new Date(example.created),
        modified: new Date(example.modified),
        ...(example.data as object),
      }
      // @ts-expect-error Unsure why `type` is in `data` - it's not there when inserted. RxDB or PouchDB or something adds it. Removing to make roundtrip testing easier.
      delete r.type
      return r as Example
    }
    // return example?.data // todo This is not quite correct! Returning dates are *sometimes* strings.
    // I think the first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
    // After an upsert, the return is a Date Object because RxDB caches the upserted object.
    // Leave this note here until you figure out how due dates are handled in Examples' Cards. Will we have to map over them to deserialize?
  },
}
