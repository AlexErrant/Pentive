import { CreateRemoteTemplate } from "lrpc/src/schemas/template"
import { RemoteTemplateId, TemplateId } from "../domain/ids"
import { Field, Template, TemplateType } from "../domain/template"
import { assertNever, DbId, undefinedMap } from "shared"
import { getDb, getKysely } from "./crsqlite"
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    push: (template.push === 1 ? true : undefined) as true | undefined,
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
    for (const t of templates) {
      await this.insertTemplate(t) // medTODO could probably make this better. Can't seem to find anything for parameterized bulk inserts.
      // https://stackoverflow.com/q/1711631 https://stackoverflow.com/q/45562747 https://stackoverflow.com/q/3447842 https://stackoverflow.com/q/15858466 https://stackoverflow.com/q/1609637
    }
  },
  getTemplate: async function (templateId: TemplateId) {
    const db = await getDb()
    const template = await db.execO<TemplateEntity>(
      `SELECT * FROM template WHERE id = ?`,
      [templateId]
    )
    return undefinedMap(template.at(0), entityToDomain) ?? null
  },
  getTemplates: async function () {
    const db = await getDb()
    const allTemplates = await db.execO<TemplateEntity>(
      `SELECT * FROM template`
    )
    return allTemplates.map(entityToDomain)
  },
  getNewTemplatesToUpload: async function (nook: string) {
    const db = await getDb()
    const newTemplates = await db.execO<TemplateEntity>(
      `SELECT * FROM template
       WHERE push = 1
       AND pushId IS NULL;`
    )
    return newTemplates
      .map(entityToDomain)
      .map((x) => domainToCreateRemote(x, nook))
  },
}
