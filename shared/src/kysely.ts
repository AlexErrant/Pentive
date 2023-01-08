import { Kysely as RealKysely, sql, InsertResult, RawBuilder } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB } from "./database"
import { Base64, Base64Url, DbId, Hex } from "./brand"
import { binary16fromBase64URL, binary16toBase64URL } from "./util"

export class Kysely {
  #db: RealKysely<DB>

  constructor(url: string) {
    this.#db = new RealKysely<DB>({
      dialect: new PlanetScaleDialect({
        url,
      }),
    })
  }

  async getPosts({ nook }: { nook: string }): Promise<
    Array<{
      id: Base64Url
      title: string
      text: string
      authorId: string
    }>
  > {
    return await this.#db
      .selectFrom("Post")
      .select([selectId, "title", "text", "authorId"])
      .where("nook", "=", nook)
      .execute()
      .then((ps) => ps.map(mapIdToBase64Url))
  }

  async getPost(id: Base64Url): Promise<{
    id: Base64Url
    title: string
    text: string
    authorId: string
  }> {
    return await this.#db
      .selectFrom("Post")
      .select([selectId, "title", "text", "authorId"])
      .where("id", "=", fromBase64Url(id))
      .executeTakeFirstOrThrow()
      .then(mapIdToBase64Url)
  }

  async insertPost({
    authorId,
    nook,
    text,
    title,
    id,
  }: {
    authorId: string
    nook: string
    text: string
    title: string
    id: Hex
  }): Promise<InsertResult[]> {
    return await this.#db
      .insertInto("Post")
      .values({
        id: unhex(id),
        authorId,
        nook,
        text,
        title,
      })
      .execute()
  }
}

function unhex(id: Hex): RawBuilder<DbId> {
  return sql<DbId>`UNHEX(${id})`
}

function fromBase64(id: Base64): RawBuilder<DbId> {
  return sql<DbId>`FROM_BASE64(${id})`
}

function fromBase64Url(id: Base64Url): RawBuilder<DbId> {
  return fromBase64(binary16fromBase64URL(id))
}

const selectId = sql<Base64>`TO_BASE64(id)`.as("id")

function mapIdToBase64Url<T>(t: T & { id: Base64 }): T & {
  id: Base64Url
} {
  return { ...t, id: binary16toBase64URL(t.id) }
}
