import { RemoteTemplateId, TemplateId } from "../domain/ids"
import { Field, Template, TemplateType } from "../domain/template"
import { CreateRemoteTemplate, assertNever, undefinedMap } from "shared"
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
    remoteId,
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
    remoteId: remoteId ?? null,
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
    remoteId: (template.remoteId ?? undefined) as RemoteTemplateId | undefined,
    fields: JSON.parse(template.fields) as Field[],
    css: template.css,
    templateType: JSON.parse(template.templateType) as TemplateType,
  }
  if (r.push === undefined) {
    delete r.push
  }
  if (r.remoteId === undefined) {
    delete r.remoteId
  }
  return r
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
    templateType: stringifyTemplates(templateType),
    fields: fields.map((x) => x.name),
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
      .where("remoteId", "is", null)
      .execute()
    return newTemplates
      .map(entityToDomain)
      .map((x) => domainToCreateRemote(x, nook))
  },
}
