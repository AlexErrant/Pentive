import { CreateRemoteTemplate } from "lrpc/src/schemas/template"
import { KeyFunctionMap, RxCollection, RxDocument } from "rxdb"
import { TemplateId } from "../domain/ids"
import { Template, TemplateType } from "../domain/template"
import { assertNever } from "shared"
import { getDb } from "./rxdb"
import { TemplateDocType } from "./template.schema"

function templateToDocType(template: Template): TemplateDocType {
  const { id, name, created, modified, push, pushId, ...shrunken } = template // https://stackoverflow.com/a/66899790
  return {
    id,
    name,
    created: created.toISOString(),
    modified: modified.toISOString(),
    push: push === true ? 1 : 0,
    pushId,
    data: shrunken,
  }
}

interface TemplateDocMethods extends KeyFunctionMap {}

export type TemplateDocument = RxDocument<TemplateDocType, TemplateDocMethods>

export type TemplateCollection = RxCollection<
  TemplateDocType,
  TemplateDocMethods
>

export const templateDocMethods: TemplateDocMethods = {}

function entityToDomain(template: TemplateDocument): Template {
  const r = {
    id: template.id as TemplateId,
    name: template.name,
    created: new Date(template.created),
    modified: new Date(template.modified),
    push: template.push === 1 ? true : undefined,
    pushId: template.pushId,
    ...(template.data as object),
  }
  // @ts-expect-error Unsure why `type` is in `data` - it's not there when inserted. RxDB or PouchDB or something adds it. Removing to make roundtrip testing easier.
  delete r.type
  if (r.push === undefined) {
    delete r.push
  }
  if (r.pushId === undefined) {
    delete r.pushId
  }
  return r as Template
  // Returning dates are *sometimes* strings.
  // The first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
  // After an upsert, the return is a Date Object because RxDB caches the upserted object... I think.
}

function stringifyTemplates(t: TemplateType): string {
  switch (t.tag) {
    case "standard":
      return JSON.stringify(t.templates)
    case "cloze":
      return JSON.stringify(t.template)
    default:
      return assertNever(t)
  }
}

function domainToCreateRemote(
  { id, name, css, templateType, fields }: Template,
  nook: string
): CreateRemoteTemplate {
  return {
    id,
    name,
    css,
    nook,
    templateType: templateType.tag,
    fields: fields.map((x) => x.name),
    childTemplates: stringifyTemplates(templateType),
  }
}

export const templateCollectionMethods = {
  upsertTemplate: async function (template: Template) {
    const db = await getDb()
    await db.templates.upsert(templateToDocType(template))
  },
  bulkUpsertTemplate: async function (templates: Template[]) {
    const db = await getDb()
    await db.templates.bulkUpsert(templates.map(templateToDocType))
  },
  getTemplate: async function (templateId: TemplateId) {
    const db = await getDb()
    const template = await db.templates.findOne(templateId).exec()
    return template == null ? null : entityToDomain(template)
  },
  getTemplates: async function () {
    const db = await getDb()
    const allTemplates = await db.templates.find().exec()
    return allTemplates.map(entityToDomain)
  },
  getNewTemplatesToUpload: async function (nook: string) {
    const db = await getDb()
    const newTemplates = await db.templates
      .find({
        selector: {
          push: {
            $eq: 1,
          },
          pushId: {
            $exists: false,
          },
        },
      })
      .exec()
    return newTemplates
      .map(entityToDomain)
      .map((x) => domainToCreateRemote(x, nook))
  },
}
