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
  NookId,
  TemplateType,
  notEmpty,
  throwExp,
  undefinedMap,
} from "shared"
import { getKysely } from "./crsqlite"
import { DB, RemoteTemplate, Template as TemplateEntity } from "./database"
import { InsertObject } from "kysely"
import { updateLocalMediaIdByRemoteMediaIdAndGetNewDoc } from "./note"

function templateToDocType(template: Template) {
  const r: InsertObject<DB, "template"> = {
    id: template.id,
    name: template.name,
    css: template.css,
    created: template.created.getTime(),
    modified: template.modified.getTime(),
    fields: JSON.stringify(template.fields),
    templateType: JSON.stringify(template.templateType),
  }
  return r
}

function entityToDomain(template: TemplateEntity, remotes: RemoteTemplate[]) {
  const r: Template = {
    id: template.id as TemplateId,
    name: template.name,
    created: new Date(template.created),
    modified: new Date(template.modified),
    fields: JSON.parse(template.fields) as Field[],
    css: template.css,
    templateType: JSON.parse(template.templateType) as TemplateType,
    remotes: new Map(
      remotes.map((r) => [r.nook as NookId, r.remoteId as RemoteTemplateId])
    ),
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

function domainToEditRemote(template: Template) {
  const remoteIds = Array.from(template.remotes.values()).filter(notEmpty)
  if (remoteIds.length === 0)
    throwExp(`Zero remoteIds - is something wrong with the SQL query?`)
  const r: EditRemoteTemplate = {
    name: template.name,
    css: template.css,
    templateType: template.templateType,
    remoteIds,
    fields: template.fields.map((x) => x.name),
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
    const remoteTemplates = await db
      .selectFrom("remoteTemplate")
      .selectAll()
      .where("localId", "=", templateId)
      .execute()
    return (
      undefinedMap(template, (x) => entityToDomain(x, remoteTemplates)) ?? null
    )
  },
  getTemplates: async function () {
    const db = await getKysely()
    const allTemplates = await db.selectFrom("template").selectAll().execute()
    const remoteTemplates = await db
      .selectFrom("remoteTemplate")
      .selectAll()
      .execute()
    return allTemplates.map((alt) =>
      entityToDomain(
        alt,
        remoteTemplates.filter((rt) => rt.localId === alt.id)
      )
    )
  },
  getNewTemplatesToUpload: async function () {
    const db = await getKysely()
    const dp = new DOMParser()
    const remoteTemplates = await db
      .selectFrom("remoteTemplate")
      .selectAll()
      .where("remoteId", "is", null)
      .execute()
    const localIds = [...new Set(remoteTemplates.map((t) => t.localId))]
    const templatesAndStuff = await db
      .selectFrom("template")
      .selectAll()
      .where("id", "in", localIds)
      .execute()
      .then((n) =>
        n
          .map((lt) =>
            entityToDomain(
              lt,
              remoteTemplates.filter((rt) => rt.localId === lt.id)
            )
          )
          .map((x) => domainToCreateRemote(x, "aRandomNook")) // nextTODO fix
          .map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
      )
    return templatesAndStuff.map((n) => n.template)
  },
  getEditedTemplatesToUpload: async function () {
    const db = await getKysely()
    const dp = new DOMParser()
    const remoteTemplates = await db
      .selectFrom("remoteTemplate")
      .leftJoin("template", "remoteTemplate.localId", "template.id")
      .selectAll("remoteTemplate")
      .where("remoteId", "is not", null)
      .whereRef("remoteTemplate.uploadDate", "<", "template.modified")
      .execute()
    const localIds = [...new Set(remoteTemplates.map((t) => t.localId))]
    const templatesAndStuff = await db
      .selectFrom("template")
      .selectAll()
      .where("id", "in", localIds)
      .execute()
      .then((n) =>
        n
          .map((lt) =>
            entityToDomain(
              lt,
              remoteTemplates.filter((rt) => rt.localId === lt.id)
            )
          )
          .map(domainToEditRemote)
          .map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
      )
    return templatesAndStuff.map((n) => n.template)
  },
  getTemplateMediaToUpload: async function () {
    const db = await getKysely()
    const mediaBinaries = await db
      .selectFrom("remoteMedia")
      .innerJoin("media", "remoteMedia.localMediaId", "media.id")
      .leftJoin("template", "remoteMedia.localEntityId", "template.id")
      .leftJoin("remoteTemplate", "remoteTemplate.localId", "template.id")
      .select([
        "remoteMedia.localMediaId",
        "media.data",
        "remoteMedia.localEntityId",
        "remoteMedia.i",
        "remoteTemplate.remoteId",
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
        m.remoteId ??
        throwExp(
          `Template media ${m.localMediaId} is missing a remoteId, is something wrong with the SQL query?`
        )
      const value =
        media.get(m.localMediaId) ??
        throwExp(`mediaBinaries is missing '${m.localMediaId}'... how?`)
      value.ids.push([m.localEntityId, remoteId, m.i])
    }
    return media
  },
  makeTemplateUploadable: async function (
    templateId: TemplateId,
    nook: NookId
  ) {
    const db = await getKysely()
    const remoteTemplate = {
      localId: templateId,
      nook,
      remoteId: null,
      uploadDate: null,
    }
    await db.transaction().execute(async (db) => {
      await db
        .insertInto("remoteTemplate")
        .values(remoteTemplate)
        .onConflict((db) => db.doNothing())
        .execute()
      const template = await db
        .selectFrom("template")
        .selectAll()
        .where("id", "=", templateId)
        .executeTakeFirstOrThrow()
      const { localMediaIdByRemoteMediaId } = withLocalMediaIdByRemoteMediaId(
        new DOMParser(),
        domainToCreateRemote(entityToDomain(template, [remoteTemplate]), nook)
      )
      const srcs = Array.from(localMediaIdByRemoteMediaId.values())
      const mediaBinaries = await db
        .selectFrom("media")
        .select(["id", "data"])
        .where("id", "in", srcs)
        .execute()
      if (mediaBinaries.length !== srcs.length)
        throwExp("You're missing a media.") // medTODO better error message
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
  updateTemplateRemoteIds: async function (
    remoteIdByLocal: Map<readonly [TemplateId, NookId], RemoteTemplateId>
  ) {
    const db = await getKysely()
    for (const [[templateId, nook], remoteId] of remoteIdByLocal) {
      const r = await db
        .updateTable("remoteTemplate")
        .set({ remoteId, uploadDate: new Date().getTime() })
        .where("nook", "=", nook)
        .where("localId", "=", templateId)
        .returningAll()
        .execute()
      if (r.length !== 1)
        throwExp(
          `No remoteTemplate found for nook '${nook}' and templateId '${templateId}'`
        )
    }
  },
  markTemplateAsPushed: async function (remoteTemplateIds: RemoteTemplateId[]) {
    const db = await getKysely()
    const r = await db
      .updateTable("remoteTemplate")
      .set({ uploadDate: new Date().getTime() })
      .where("remoteId", "in", remoteTemplateIds)
      .returningAll()
      .execute()
    if (r.length !== remoteTemplateIds.length)
      throwExp(
        `Some remoteTemplates in ${JSON.stringify(
          remoteTemplateIds
        )} not found. (This is the worst error message ever - medTODO.)`
      )
  },
  updateTemplate: async function (template: Template) {
    const db = await getKysely()
    const { id, ...rest } = templateToDocType(template)
    const r = await db
      .updateTable("template")
      .set(rest)
      .where("id", "=", id)
      .returningAll()
      .execute()
    if (r.length !== 1) throwExp(`No template found for id '${template.id}'.`)
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
