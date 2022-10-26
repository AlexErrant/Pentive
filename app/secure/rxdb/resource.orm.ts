import { KeyFunctionMap, RxCollection, RxDocument } from "rxdb"
import { RemoteResourceId, ResourceId } from "../../src/domain/ids"
import { Resource } from "../../src/domain/resource"
import { getDb } from "./rxdb"
import { ResourceDocType } from "./resource.schema"
import { throwExp } from "../../src/domain/utility"

function resourceToDocType(resource: Omit<Resource, "data">): ResourceDocType {
  const { created } = resource // https://stackoverflow.com/a/66899790
  return {
    ...resource,
    created: created.toISOString(),
  }
}

interface ResourceDocMethods extends KeyFunctionMap {}

export type ResourceDocument = RxDocument<ResourceDocType, ResourceDocMethods>

export type ResourceCollection = RxCollection<
  ResourceDocType,
  ResourceDocMethods
>

export const resourceDocMethods: ResourceDocMethods = {}

function entityToDomain(resource: ResourceDocument): Resource {
  const r = {
    id: resource.id as ResourceId,
    remoteId: resource.remoteId as RemoteResourceId,
    created: new Date(resource.created),
  }
  // @ts-expect-error Unsure why `type` is in `data` - it's not there when inserted. RxDB or PouchDB or something adds it. Removing to make roundtrip testing easier.
  delete r.type
  return r as Resource
  // Returning dates are *sometimes* strings.
  // The first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
  // After an upsert, the return is a Date Object because RxDB caches the upserted object... I think.
}

const attachmentId = "id"

export const resourceCollectionMethods = {
  upsertResource: async function ({ data, ...resource }: Resource) {
    const db = await getDb()
    const upserted = await db.resources.upsert(resourceToDocType(resource))
    await upserted.putAttachment({
      id: attachmentId,
      type: "", // nextTODO
      data: new Blob([data]),
    })
  },
  getResource: async function (resourceId: ResourceId) {
    const db = await getDb()
    const resource = await db.resources.findOne(resourceId).exec()
    if (resource == null) {
      return resource
    } else {
      const data =
        (await resource.getAttachment(attachmentId)?.getData()) ??
        throwExp("Impossible, unless attachmentId got screwed up")
      return {
        ...entityToDomain(resource),
        data: data as Blob,
      }
    }
  },
}
