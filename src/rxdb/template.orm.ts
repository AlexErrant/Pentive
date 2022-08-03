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
    return template?.data as Template | null // todo This is not quite correct! Returning dates are *sometimes* strings.
    // I think the first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
    // After an upsert, the return is a Date Object because RxDB caches the upserted object.
  },
}
