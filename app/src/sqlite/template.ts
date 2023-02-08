import { CreateRemoteTemplate } from "lrpc/src/schemas/template"
import { RemoteTemplateId, TemplateId } from "../domain/ids"
import { Field, Template, TemplateType } from "../domain/template"
import { assertNever, undefinedMap } from "shared"
import { getKysely } from "./crsqlite"
import { DB, Template as TemplateEntity } from "./database"
import { InsertObject } from "kysely"

function templateToDocType(template: Template): InsertObject<DB, "template"> {
  const {
    id,
    name,
    created,
    modified,
    push,
    pushId,
    css,
    fields,
    templateType,
  } = template
  return {
    id,
    name,
    created: created.getTime(),
    modified: modified.getTime(),
    push: push === true ? 1 : 0,
    pushId: pushId ?? null,
    css,
    fields: JSON.stringify(fields),
    templateType: JSON.stringify(templateType),
  }
}

function entityToDomain(template: TemplateEntity): Template {
  const r = {
    id: template.id as TemplateId,
    name: template.name,
    created: new Date(template.created),
    modified: new Date(template.modified),
    push: template.push === 1 ? (true as const) : undefined,
    pushId: (template.pushId ?? undefined) as RemoteTemplateId | undefined,
    fields: JSON.parse(template.fields) as Field[],
    css: template.css,
    templateType: JSON.parse(template.templateType) as TemplateType,
  }
  // @ts-expect-error Unsure why `type` is in `data` - it's not there when inserted. RxDB or PouchDB or something adds it. Removing to make roundtrip testing easier.
  delete r.type
  if (r.push === undefined) {
    delete r.push
  }
  if (r.pushId === undefined) {
    delete r.pushId
  }
  return r
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
  insertTemplate: async function (template: Template) {
    const t = templateToDocType(template)
    const db = await getKysely()
    await db.insertInto("template").values(t).execute()
  },
  bulkUpsertTemplate: async function (templates: Template[]) {
    const ts = templates.map(templateToDocType)
    const db = await getKysely()
    await db.insertInto("template").values(ts).execute()
  },
  getTemplate: async function (templateId: TemplateId) {
    const db = await getKysely()
    const template = await db
      .selectFrom("template")
      .selectAll()
      .where("id", "=", templateId)
      .executeTakeFirst()
    return undefinedMap(template, entityToDomain) ?? null
  },
  getTemplates: async function () {
    const db = await getKysely()
    const allTemplates = await db.selectFrom("template").selectAll().execute()
    return allTemplates.map(entityToDomain)
  },
  getNewTemplatesToUpload: async function (nook: string) {
    const db = await getKysely()
    const newTemplates = await db
      .selectFrom("template")
      .selectAll()
      .where("push", "=", 1)
      .where("pushId", "is", null)
      .execute()
    return newTemplates
      .map(entityToDomain)
      .map((x) => domainToCreateRemote(x, nook))
  },
}
