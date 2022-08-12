import { KeyFunctionMap, RxCollection, RxDocument } from "rxdb"
import { TemplateId } from "../domain/ids"
import { Template } from "../domain/template"
import { TemplateDocType } from "./template.schema"

export function templateToDocType(template: Template): TemplateDocType {
  const { id, name, created, modified, ...shrunken } = template // https://stackoverflow.com/a/66899790
  return {
    id,
    name,
    created: created.toISOString(),
    modified: modified.toISOString(),
    data: shrunken,
  }
}

interface TemplateDocMethods extends KeyFunctionMap {}

export type TemplateDocument = RxDocument<TemplateDocType, TemplateDocMethods>

interface TemplateCollectionMethods extends KeyFunctionMap {
  getTemplate: (templateId: TemplateId) => Promise<Template | null>
}

export type TemplateCollection = RxCollection<
  TemplateDocType,
  TemplateDocMethods,
  TemplateCollectionMethods
>

export const templateDocMethods: TemplateDocMethods = {}

export const templateCollectionMethods: TemplateCollectionMethods = {
  getTemplate: async function (
    this: TemplateCollection,
    templateId: TemplateId
  ) {
    const template = await this.findOne(templateId).exec()
    if (template == null) {
      return null
    } else {
      const r = {
        id: template.id as TemplateId,
        name: template.name,
        created: new Date(template.created),
        modified: new Date(template.modified),
        ...(template.data as object),
      }
      // @ts-expect-error Unsure why `type` is in `data` - it's not there when inserted. RxDB or PouchDB or something adds it. Removing to make roundtrip testing easier.
      delete r.type
      return r as Template
    }
    return template?.data as Template | null // todo This is not quite correct! Returning dates are *sometimes* strings.
    // I think the first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
    // After an upsert, the return is a Date Object because RxDB caches the upserted object.
    // Leave this note here until you figure out how due dates are handled in Cards' Cards. Will we have to map over them to deserialize?
  },
}
