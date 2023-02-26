import {
  MediaId,
  RemoteMediaNum,
  RemoteTemplateId,
  TemplateId,
} from "../domain/ids"
import { Field, Template } from "../domain/template"
import {
  CreateRemoteTemplate,
  EditRemoteTemplate,
  TemplateType,
  throwExp,
  undefinedMap,
} from "shared"
import { getKysely } from "./crsqlite"
import { DB, Template as TemplateEntity } from "./database"
import { InsertObject } from "kysely"
import { updateLocalMediaIdByRemoteMediaIdAndGetNewDoc } from "./note"

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

function domainToCreateRemote(
  { id, name, css, templateType, fields }: Template,
  nook: string
) {
  const r: CreateRemoteTemplate = {
    localId: id,
    name,
    css,
    nook,
    templateType,
    fields: fields.map((x) => x.name),
  }
  return r
}

function domainToEditRemote({
  id,
  remoteId,
  name,
  css,
  templateType,
  fields,
}: Template) {
  const r: EditRemoteTemplate = {
    remoteId:
      remoteId ??
      throwExp(
        `Template ${id} is missing a remoteId... is something wrong with the SQL query?`
      ),
    name,
    css,
    templateType,
    fields: fields.map((x) => x.name),
  }
  return r
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
  getNewTemplatesToUpload: async function () {
    const db = await getKysely()
    const dp = new DOMParser()
    const templatesAndStuff = await db
      .selectFrom("template")
      .selectAll()
      .where("push", "=", 1)
      .where("remoteId", "is", null)
      .execute()
      .then((n) =>
        n
          .map(entityToDomain)
          .map((x) => domainToCreateRemote(x, "aRandomNook")) // nextTODO fix
          .map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
      )
    return templatesAndStuff.map((n) => n.template)
  },
  getEditedTemplatesToUpload: async function () {
    const db = await getKysely()
    const dp = new DOMParser()
    const templatesAndStuff = await db
      .selectFrom("template")
      .selectAll()
      .where("push", "=", 1)
      .where("remoteId", "is not", null)
      .execute()
      .then((n) =>
        n
          .map(entityToDomain)
          .map(domainToEditRemote)
          .map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
      )
    return templatesAndStuff.map((n) => n.template)
  },
  getMediaToUpload: async function () {
    const db = await getKysely()
    const mediaBinaries = await db
      .selectFrom("remoteMedia")
      .innerJoin("media", "remoteMedia.localMediaId", "media.id")
      .leftJoin("template", "remoteMedia.localEntityId", "template.id")
      .select([
        "remoteMedia.localMediaId",
        "media.data",
        "remoteMedia.localEntityId",
        "remoteMedia.i",
        "template.remoteId as templateRemoteId",
      ])
      .where("remoteMedia.uploadDate", "is", null)
      .orWhereRef("media.modified", ">", "remoteMedia.uploadDate")
      .execute()
    const media = new Map<
      MediaId,
      {
        data: ArrayBuffer
        ids: Array<[TemplateId, RemoteTemplateId, RemoteMediaNum]>
      }
    >(
      mediaBinaries.map(({ localMediaId, data }) => [
        localMediaId,
        { data, ids: [] },
      ])
    )
    for (const m of mediaBinaries) {
      const remoteId =
        (m.templateRemoteId as RemoteTemplateId) ??
        `Template ${m.localMediaId} is missing a templateRemoteId... is something wrong with the SQL query?`
      const value =
        media.get(m.localMediaId) ??
        throwExp(`mediaBinaries is missing '${m.localMediaId}'... how?`)
      value.ids.push([m.localEntityId, remoteId, m.i])
    }
    return media
  },
  makeTemplateUploadable: async function (templateId: TemplateId) {
    const db = await getKysely()
    await db
      .updateTable("template")
      .set({ push: 1 })
      .where("id", "=", templateId)
      .execute()
    const template = await db
      .selectFrom("template")
      .selectAll()
      .where("id", "=", templateId)
      .executeTakeFirstOrThrow()
    const { localMediaIdByRemoteMediaId } = withLocalMediaIdByRemoteMediaId(
      new DOMParser(),
      domainToCreateRemote(entityToDomain(template), "aRandomNook") // nextTODO fix
    )
    const srcs = Array.from(localMediaIdByRemoteMediaId.values())
    const mediaBinaries = await db
      .selectFrom("media")
      .select(["id", "data"])
      .where("id", "in", srcs)
      .execute()
    if (mediaBinaries.length !== srcs.length)
      throwExp("You're missing a media.") // medTODO better error message
    await db.transaction().execute(async (db) => {
      await db
        .deleteFrom("remoteMedia")
        .where("localEntityId", "=", templateId)
        .where("i", ">", srcs.length as RemoteMediaNum)
        .execute()
      await db
        .insertInto("remoteMedia")
        .values(
          Array.from(localMediaIdByRemoteMediaId).map(([i, localMediaId]) => ({
            localEntityId: templateId,
            i,
            localMediaId,
          }))
        )
        // insert into "remoteMedia" ("localEntityId", "i", "localMediaId") values (?, ?, ?)
        // on conflict do update set "localMediaId" = "excluded"."localMediaId"
        .onConflict((db) =>
          db.doUpdateSet({
            localMediaId: (x) => x.ref("excluded.localMediaId"),
          })
        )
        .execute()
    })
  },
  updateRemoteIds: async function (
    remoteIdByLocal: Record<TemplateId, RemoteTemplateId>
  ) {
    const db = await getKysely()
    for (const templateId in remoteIdByLocal) {
      const remoteId = remoteIdByLocal[templateId as TemplateId]
      await db
        .updateTable("template")
        .set({ remoteId, push: null })
        .where("id", "=", templateId as TemplateId)
        .execute()
    }
  },
  markAsPushed: async function (remoteTemplateIds: RemoteTemplateId[]) {
    const db = await getKysely()
    await db
      .updateTable("template")
      .set({ push: null })
      .where("remoteId", "in", remoteTemplateIds)
      .execute()
  },
  updateUploadDate: async function (
    ids: Array<[TemplateId, RemoteTemplateId, RemoteMediaNum]>
  ) {
    const db = await getKysely()
    for (const [localEntityId, , i] of ids) {
      await db
        .updateTable("remoteMedia")
        .set({ uploadDate: new Date().getTime() })
        .where("localEntityId", "=", localEntityId)
        .where("i", "=", i)
        .execute()
    }
  },
  updateTemplate: async function (template: Template) {
    const db = await getKysely()
    const { id, ...rest } = templateToDocType(template)
    await db.updateTable("template").set(rest).where("id", "=", id).execute()
  },
}

function withLocalMediaIdByRemoteMediaId<
  T extends CreateRemoteTemplate | EditRemoteTemplate
>(dp: DOMParser, template: T) {
  const localMediaIdByRemoteMediaId = new Map<RemoteMediaNum, MediaId>()
  const serializer = new XMLSerializer()
  if (template.templateType.tag === "standard") {
    for (const t of template.templateType.templates) {
      const docFront = updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
        dp,
        t.front,
        localMediaIdByRemoteMediaId
      )
      t.front = serializer.serializeToString(docFront)
      const docBack = updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
        dp,
        t.back,
        localMediaIdByRemoteMediaId
      )
      t.back = serializer.serializeToString(docBack)
    }
  } else {
    const docFront = updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
      dp,
      template.templateType.template.front,
      localMediaIdByRemoteMediaId
    )
    template.templateType.template.front =
      serializer.serializeToString(docFront)
    const docBack = updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
      dp,
      template.templateType.template.back,
      localMediaIdByRemoteMediaId
    )
    template.templateType.template.back = serializer.serializeToString(docBack)
  }
  return {
    template,
    localMediaIdByRemoteMediaId,
  }
}
